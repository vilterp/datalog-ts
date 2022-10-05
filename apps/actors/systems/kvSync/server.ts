import { ActorResp, LoadedTickInitiator, OutgoingMessage } from "../../types";
import {
  keyInQuery,
  LiveQueryRequest,
  LiveQueryResponse,
  LiveQueryUpdate,
  MsgToClient,
  MsgToServer,
  MutationDefns,
  MutationRequest,
  MutationResponse,
  Query,
  VersionedValue,
  WriteOp,
} from "./types";
import * as effects from "../../effects";
import {
  filterMap,
  filterObj,
  flatMap,
  pairsToObj,
} from "../../../../util/util";
import { runMutationServer } from "./mutations/server";
import { jsonEq } from "../../../../util/json";

export type ServerState = {
  type: "ServerState";
  data: { [key: string]: VersionedValue };
  liveQueries: { clientID: string; query: Query }[]; // TODO: index
  mutationDefns: MutationDefns;
};

export function initialServerState(mutationDefns: MutationDefns): ServerState {
  return {
    type: "ServerState",
    data: {},
    liveQueries: [],
    mutationDefns,
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
  const results = filterObj(state.data, (key, value) =>
    keyInQuery(key, req.query)
  );
  return [newState, { type: "LiveQueryResponse", id: req.id, results }];
}

function runMutationOnServer(
  state: ServerState,
  req: MutationRequest
): [ServerState, MutationResponse, LiveQueryUpdate[]] {
  const [newState, outcome, trace] = runMutationServer(
    state,
    req.txnID,
    state.mutationDefns[req.invocation.name],
    req.invocation.args
  );
  if (outcome === "Abort") {
    return [
      state,
      {
        type: "MutationResponse",
        txnID: req.txnID,
        // TODO: include abort reason?
        payload: { type: "Reject", serverTrace: trace, reason: "txn aborted" },
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
      return {
        type: "LiveQueryUpdate",
        clientID: liveQuery.clientID,
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
      payload: { type: "Accept" },
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
            msg
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
