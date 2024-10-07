import { ActorResp, LoadedTickInitiator, OutgoingMessage } from "../../types";
import {
  AbortError,
  KVData,
  LiveQueryRequest,
  LiveQueryResponse,
  LiveQueryUpdate,
  MsgToClient,
  MsgToServer,
  MutationRequest,
  MutationResponse,
  QueryInvocation,
  Trace,
  TransactionMetadata,
  TSMutationDefns,
  WriteOp,
} from "./types";
import * as effects from "../../effects";
import { filterMap, mapObj, randStep2, removeKey } from "../../../../util/util";
import { Json, jsonEq } from "../../../../util/json";
import { keyInTrace, runQuery } from "./query";
import { MutationContextImpl } from "./common";
import { KVApp } from "./kvApp";

export type ServerState = {
  type: "ServerState";
  data: KVData;
  users: { [name: string]: string }; // password
  userSessions: { [token: string]: string }; // username
  liveQueries: {
    clientID: string;
    invocation: QueryInvocation;
    trace: Trace;
  }[]; // TODO: index
  transactionMetadata: TransactionMetadata;
  randSeed: number;
  time: number;
};

export function initialServerState(
  initialKVPairs: { [key: string]: Json },
  randSeed: number
): ServerState {
  return {
    type: "ServerState",
    users: {},
    userSessions: {},
    data: mapObj(initialKVPairs, (key, value) => [
      {
        value,
        transactionID: "0",
      },
    ]),
    liveQueries: [],
    transactionMetadata: {
      0: {
        serverTimestamp: 0,
        invocation: { type: "Invocation", name: "Initial", args: [] },
      },
    },
    randSeed,
    time: 0,
  };
}

function processLiveQueryRequest(
  app: KVApp,
  state: ServerState,
  clientID: string,
  req: LiveQueryRequest
): [ServerState, LiveQueryResponse] {
  // TODO: dedup with useQuery
  const txnIsCommitted = () => true;

  const txnID = state.randSeed.toString();

  const ctx = new MutationContextImpl(
    txnID,
    "server", // who is the user?
    state.data,
    txnIsCommitted,
    state.randSeed
  );

  const [results, trace] = runQuery(app, ctx, req.invocation);
  const transactionTimestamps: TransactionMetadata = {};
  for (const op of trace) {
    switch (op.type) {
      case "Read":
        transactionTimestamps[op.value.transactionID] =
          state.transactionMetadata[op.value.transactionID];
        break;
      case "ReadRange":
        for (const key in op.values) {
          transactionTimestamps[op.values[key].transactionID] =
            state.transactionMetadata[op.values[key].transactionID];
        }
        break;
      case "Write":
        throw new Error("unexpected write in trace");
    }
  }

  const newState: ServerState = {
    ...state,
    liveQueries: [
      ...state.liveQueries,
      { clientID, invocation: req.invocation, trace },
    ],
  };

  return [
    newState,
    {
      type: "LiveQueryResponse",
      id: req.id,
      results,
      trace,
      transactionMetadata: transactionTimestamps,
    },
  ];
}

function runMutationOnServer(
  mutationDefns: TSMutationDefns,
  state: ServerState,
  user: string,
  req: MutationRequest,
  clientID: string
): [ServerState, MutationResponse, LiveQueryUpdate[]] {
  const isTxnCommitted = (txnID: string) => true;
  const txnTime = state.time;

  const ctx = new MutationContextImpl(
    req.txnID,
    user,
    state.data,
    isTxnCommitted,
    req.interpState.randSeed
  );

  try {
    const mutation = mutationDefns[req.invocation.name];
    if (!mutation) {
      throw new Error(`Unknown mutation: ${req.invocation.name}`);
    }

    const resVal = mutation(ctx, req.invocation.args);
  } catch (e) {
    if (e instanceof AbortError) {
      console.warn("SERVER: rejecting txn due to abort", e);
      return [
        state,
        {
          type: "MutationResponse",
          txnID: req.txnID,
          payload: {
            type: "Reject",
            timestamp: txnTime,
            serverTrace: ctx.trace,
            reason: {
              type: "FailedOnServer",
              failure: { type: "LogicError", reason: JSON.stringify(e.resVal) },
            },
          },
        },
        [],
      ];
    }
    throw e;
  }

  const newState: ServerState = {
    ...state,
    time: state.time + 1,
    randSeed: ctx.randState,
    transactionMetadata: {
      ...state.transactionMetadata,
      [req.txnID]: { serverTimestamp: txnTime, invocation: req.invocation },
    },
    data: ctx.kvData,
  };
  if (!jsonEq(ctx.trace, req.trace)) {
    console.warn("SERVER: rejecting txn due to trace mismatch", {
      invocation: req.invocation,
      from: clientID,
      serverTrace: ctx.trace,
      clientTrace: req.trace,
    });
    return [
      state,
      {
        type: "MutationResponse",
        txnID: req.txnID,
        payload: {
          type: "Reject",
          timestamp: txnTime,
          serverTrace: ctx.trace,
          reason: {
            type: "FailedOnServer",
            failure: { type: "TraceDoesntMatch" },
          },
        },
      },
      [],
    ];
  }
  // live query updates
  const writes: WriteOp[] = ctx.trace.filter(
    (op) => op.type === "Write"
  ) as WriteOp[];
  const liveQueryUpdates: LiveQueryUpdate[] = filterMap(
    state.liveQueries,
    (liveQuery) => {
      const matchingWrites = writes.filter((write) =>
        keyInTrace(write.key, liveQuery.trace)
      );
      if (matchingWrites.length === 0) {
        return null;
      }
      // skip originating client
      if (liveQuery.clientID === clientID) {
        return null;
      }

      return {
        type: "LiveQueryUpdate",
        clientID: liveQuery.clientID,
        transactionMetadata: {
          [req.txnID]: { serverTimestamp: txnTime, invocation: req.invocation },
        },
        updates: matchingWrites.map((write) =>
          write.desc.type === "Delete"
            ? { type: "Deleted", key: write.key }
            : {
                type: "Updated",
                key: write.key,
                value: write.desc.after,
              }
        ),
      };
    }
  );
  return [
    newState,
    {
      type: "MutationResponse",
      txnID: req.txnID,
      payload: { type: "Accept", timestamp: txnTime },
    },
    liveQueryUpdates,
  ];
}

// TODO: maybe move this out to index.ts? idk
export function updateServer(
  app: KVApp,
  state: ServerState,
  init: LoadedTickInitiator<ServerState, MsgToServer>
): ActorResp<ServerState, MsgToClient> {
  switch (init.type) {
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        case "SignupRequest": {
          if (state.users[msg.username]) {
            return effects.reply(init, state, {
              type: "SignupResponse",
              response: { type: "Failure", msg: "User already exists" },
            });
          }

          const [token, newSeed] = randStep2(state.randSeed);
          const newState: ServerState = {
            ...state,
            randSeed: newSeed,
            users: { ...state.users, [msg.username]: msg.password },
            userSessions: { ...state.userSessions, [token]: msg.username },
          };
          return effects.reply(init, newState, {
            type: "SignupResponse",
            response: { type: "Success", token: token.toString() },
          });
        }
        case "LogInRequest": {
          if (state.users[msg.username] !== msg.password) {
            return effects.reply(init, state, {
              type: "LogInResponse",
              response: { type: "Failure" },
            });
          }
          const [token, newSeed] = randStep2(state.randSeed);
          const newState: ServerState = {
            ...state,
            randSeed: newSeed,
            userSessions: {
              ...state.userSessions,
              [token]: msg.username,
            },
          };
          return effects.reply(init, newState, {
            type: "LogInResponse",
            response: { type: "Success", token: token.toString() },
          });
        }
        case "AuthenticatedRequest": {
          if (!state.userSessions[msg.token]) {
            return effects.reply(init, state, { type: "UnauthorizedError" });
          }
          const user = state.userSessions[msg.token];
          const innerMsg = msg.request;
          switch (innerMsg.type) {
            case "LogOutRequest": {
              const newState: ServerState = {
                ...state,
                userSessions: removeKey(state.userSessions, msg.token),
              };
              return effects.reply(init, newState, { type: "LogOutResponse" });
            }
            case "LiveQueryRequest": {
              const [newState, resp] = processLiveQueryRequest(
                app,
                state,
                init.from,
                innerMsg
              );
              return effects.reply(init, newState, resp);
            }
            case "MutationRequest": {
              const [newState, mutationResp, updates] = runMutationOnServer(
                app.mutations,
                state,
                user,
                innerMsg,
                init.from
              );
              const outgoing: OutgoingMessage<MsgToClient>[] = [
                { to: init.from, msg: mutationResp },
                ...updates.map((update) => ({
                  to: update.clientID,
                  msg: update,
                })),
              ];
              return effects.updateAndSend(newState, outgoing);
            }
          }
        }
      }
    }
    default:
      return effects.updateState(state);
  }
}
