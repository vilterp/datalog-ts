import { ActorResp, LoadedTickInitiator, OutgoingMessage } from "../../types";
import {
  AbortError,
  KeyUpdate,
  KVData,
  LiveQueryRequest,
  LiveQueryResponse,
  LiveQueryUpdate,
  MsgToClient,
  MsgToServer,
  MutationCtx,
  MutationRequest,
  MutationResponse,
  QueryInvocation,
  Trace,
  TransactionMetadata,
  WriteDesc,
  WriteOp,
} from "./types";
import * as effects from "../../effects";
import { filterMap, mapObj, randStep2, removeKey } from "../../../../util/util";
import { Json, jsonEq } from "../../../../util/json";
import { keyInTrace, runQuery } from "./query";
import { MutationContextImpl } from "./common";
import { KVApp } from "./kvApp";
import { diff } from "deep-diff";

export type ServerState = {
  type: "ServerState";
  data: KVData;
  users: { [name: string]: string }; // password
  userSessions: { [token: string]: string }; // username
  liveQueries: LiveQueryRec[]; // TODO: index
  transactionMetadata: TransactionMetadata;
  randSeed: number;
  time: number;
};

type LiveQueryRec = {
  clientID: string;
  invocation: QueryInvocation;
  trace: Trace;
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
  app: KVApp,
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
    const mutation = app.mutations[req.invocation.name];
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
  const serverTrace = ctx.trace;
  const clientTrace = req.trace;

  if (!jsonEq(serverTrace, clientTrace)) {
    console.warn("SERVER: rejecting txn due to trace mismatch", {
      invocation: req.invocation,
      from: clientID,
      serverTrace,
      clientTrace,
      diff: diff(serverTrace, clientTrace),
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
  const liveQueryUpdates = getLiveQueryUpdates(
    app,
    newState,
    ctx,
    req,
    clientID,
    txnTime
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

function getLiveQueryUpdates(
  app: KVApp,
  state: ServerState,
  ctx: MutationCtx,
  req: MutationRequest,
  clientID: string,
  txnTime: number
): LiveQueryUpdate[] {
  const writes: WriteOp[] = ctx.trace.filter(
    (op) => op.type === "Write"
  ) as WriteOp[];

  const matchingLiveQueries = getMatchingInvocations(state, writes);

  // re-invoke the matching invocations
  const out: LiveQueryUpdate[] = [];

  for (const liveQuery of matchingLiveQueries) {
    const [newRes, newTrace] = runQuery(app, ctx, liveQuery.invocation);

    for (const op of newTrace) {
      switch (op.type) {
        case "Write":
          out.push({
            type: "LiveQueryUpdate",
            clientID: liveQuery.clientID,
            transactionMetadata: {
              [req.txnID]: {
                serverTimestamp: txnTime,
                invocation: req.invocation,
              },
            },
            updates: [
              op.desc.type === "Delete"
                ? { type: "Deleted", key: op.key }
                : {
                    type: "Updated",
                    key: op.key,
                    value: op.desc.after,
                  },
            ],
          });
      }
    }
  }

  return consolidateByClientIDAndKey(out);
}

function consolidateByClientIDAndKey(
  updates: LiveQueryUpdate[]
): LiveQueryUpdate[] {
  const out: LiveQueryUpdate[] = [];

  const keyToUpdates: { [clientID: string]: { [key: string]: KeyUpdate[] } } =
    {};

  for (const update of updates) {
    if (!keyToUpdates[update.clientID]) {
      keyToUpdates[update.clientID] = {};
    }

    for (const keyUpdate of update.updates) {
      if (!keyToUpdates[update.clientID][keyUpdate.key]) {
        keyToUpdates[update.clientID][keyUpdate.key] = [];
      }

      keyToUpdates[update.clientID][keyUpdate.key].push(keyUpdate);
    }
  }

  for (const clientID in keyToUpdates) {
    for (const key in keyToUpdates[clientID]) {
      out.push({
        type: "LiveQueryUpdate",
        clientID,
        transactionMetadata: updates[0].transactionMetadata,
        updates: keyToUpdates[clientID][key],
      });
    }
  }

  return out;
}

function getMatchingInvocations(
  state: ServerState,
  writes: WriteOp[]
): LiveQueryRec[] {
  const out: LiveQueryRec[] = [];

  for (const write of writes) {
    for (const liveQuery of state.liveQueries) {
      if (keyInTrace(write.key, liveQuery.trace)) {
        out.push(liveQuery);
      }
    }
  }

  return out;
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
                app,
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
