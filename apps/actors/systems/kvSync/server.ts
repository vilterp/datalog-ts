import { ActorResp, LoadedTickInitiator, OutgoingMessage } from "../../types";
import {
  KVData,
  LiveQueryRequest,
  LiveQueryResponse,
  LiveQueryUpdate,
  MsgToClient,
  MsgToServer,
  MutationDefns,
  MutationRequest,
  MutationResponse,
  Query,
  TransactionMetadata,
  WriteOp,
} from "./types";
import * as effects from "../../effects";
import { filterMap } from "../../../../util/util";
import { jsonEq } from "../../../../util/json";
import { runMutation } from "./mutations/run";
import { keyInQuery, runQuery } from "./query";

export type ServerState = {
  type: "ServerState";
  data: KVData;
  liveQueries: { clientID: string; query: Query }[]; // TODO: index
  transactionMetadata: TransactionMetadata;
  mutationDefns: MutationDefns;
  time: number;
};

export function initialServerState(mutationDefns: MutationDefns): ServerState {
  return {
    type: "ServerState",
    data: {},
    liveQueries: [],
    transactionMetadata: {},
    mutationDefns,
    time: 0,
  };
}

function processLiveQueryRequest(
  state: ServerState,
  clientID: string,
  req: LiveQueryRequest
): [ServerState, LiveQueryResponse] {
  const newState: ServerState = {
    ...state,
    liveQueries: [...state.liveQueries, { clientID, query: req.query }],
  };
  // TODO: dedup with useQuery
  const results = runQuery(state.data, req.query);
  const transactionTimestamps: TransactionMetadata = {};
  Object.values(results).forEach((vv) => {
    transactionTimestamps[vv.transactionID] =
      state.transactionMetadata[vv.transactionID];
  });
  return [
    newState,
    {
      type: "LiveQueryResponse",
      id: req.id,
      results,
      transactionMetadata: transactionTimestamps,
    },
  ];
}

function runMutationOnServer(
  state: ServerState,
  req: MutationRequest,
  clientID: string
): [ServerState, MutationResponse, LiveQueryUpdate[]] {
  const [newData, resVal, newInterpState, outcome, trace] = runMutation(
    state.data,
    req.interpState,
    req.txnID,
    state.mutationDefns[req.invocation.name],
    req.invocation.args,
    clientID
  );
  const txnTime = state.time;
  const newState: ServerState = {
    ...state,
    time: state.time + 1,
    transactionMetadata: {
      ...state.transactionMetadata,
      [req.txnID]: { serverTimestamp: txnTime, invocation: req.invocation },
    },
    data: newData,
  };
  if (outcome === "Abort") {
    return [
      state,
      {
        type: "MutationResponse",
        txnID: req.txnID,
        // TODO: include abort reason?
        payload: {
          type: "Reject",
          serverTrace: trace,
          // TODO: pretty print
          reason: JSON.stringify(resVal),
        },
      },
      [],
    ];
  }
  if (!jsonEq(trace, req.trace)) {
    console.warn("SERVER: rejecting txn due to trace mismatch", {
      serverTrace: trace,
      clientTrace: req.trace,
    });
    return [
      state,
      {
        type: "MutationResponse",
        txnID: req.txnID,
        payload: {
          type: "Reject",
          serverTrace: trace,
          reason: "trace not equal",
        },
      },
      [],
    ];
  }
  // live query updates
  const writes: WriteOp[] = trace.filter(
    (op) => op.type === "Write"
  ) as WriteOp[];
  const liveQueryUpdates: LiveQueryUpdate[] = filterMap(
    state.liveQueries,
    (liveQuery) => {
      const matchingWrites = writes.filter((write) =>
        keyInQuery(write.key, liveQuery.query)
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
        updates: matchingWrites.map((write) => ({
          type: "Updated",
          key: write.key,
          value: {
            value: write.value,
            transactionID: req.txnID,
          },
        })),
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
  state: ServerState,
  init: LoadedTickInitiator<ServerState, MsgToServer>
): ActorResp<ServerState, MsgToClient> {
  switch (init.type) {
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        case "LiveQueryRequest": {
          const [newState, resp] = processLiveQueryRequest(
            state,
            init.from,
            msg
          );
          return effects.reply(init, newState, resp);
        }
        case "MutationRequest": {
          const [newState, mutationResp, updates] = runMutationOnServer(
            state,
            msg,
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
    default:
      return effects.updateState(state);
  }
}
