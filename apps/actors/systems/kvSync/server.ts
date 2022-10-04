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
  ServerValue,
  WriteOp,
} from "./types";
import * as effects from "../../effects";
import { filterMap, flatMap, pairsToObj } from "../../../../util/util";
import { runMutationServer } from "./mutations/server";

export type ServerState = {
  type: "ServerState";
  data: { key: string; value: ServerValue }[]; // TODO: ordered map of some kind
  liveQueries: { clientID: string; query: Query }[]; // TODO: index
  mutationDefns: MutationDefns;
};

export function initialServerState(mutationDefns: MutationDefns): ServerState {
  return {
    type: "ServerState",
    data: [],
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
  const results = state.data.filter((kv) => keyInQuery(kv.key, req.query));
  return [
    newState,
    { type: "LiveQueryResponse", results: pairsToObj(results) },
  ];
}

function runMutationOnServer(
  state: ServerState,
  req: MutationRequest
): [ServerState, MutationResponse, LiveQueryUpdate[]] {
  const [newState, outcome, trace] = runMutationServer(
    state,
    state.mutationDefns[req.invocation.name],
    req.invocation.args
  );
  if (outcome === "Abort") {
    return [
      newState,
      { type: "MutationResponse", payload: { type: "Aborted" } },
      [],
    ];
  }
  if (JSON.stringify(trace) !== JSON.stringify(req.trace)) {
    return [
      newState,
      {
        type: "MutationResponse",
        payload: { type: "Reject", serverTrace: trace },
      },
      [],
    ];
  }
  const writes: WriteOp[] = trace.filter(
    (op) => op.type === "Write"
  ) as WriteOp[];
  return [
    newState,
    {
      type: "MutationResponse",
      payload: { type: "Accept" },
    },
    filterMap(state.liveQueries, (liveQuery) => {
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
          value: write.value,
          newVersion: write.newVersion,
        })),
      };
    }),
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
