import { ActorResp, LoadedTickInitiator, OutgoingMessage } from "../../types";
import {
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
} from "./types";
import * as effects from "../../effects";

export type ServerState = {
  type: "ServerState";
  data: { key: string; value: VersionedValue }[]; // TODO: ordered map of some kind
  liveQueries: { clientID: string; query: Query }[]; // TODO: index
  mutationDefns: MutationDefns;
};

export const initialServerState: ServerState = {
  type: "ServerState",
  data: [],
  liveQueries: [],
  mutationDefns: {},
};

function processLiveQueryRequest(
  state: ServerState,
  clientID: string,
  req: LiveQueryRequest
): [ServerState, LiveQueryResponse] {
  const newState: ServerState = {
    ...state,
    liveQueries: [...state.liveQueries, { clientID, query: req.query }],
  };
  const results = state.data.filter(
    (kv) => kv.key >= req.query.fromKey && kv.key <= req.query.toKey
  );
  return [newState, { type: "LiveQueryResponse", results: results }];
}

function runMutationOnServer(
  state: ServerState,
  mutation: MutationRequest
): [ServerState, MutationResponse, LiveQueryUpdate[]] {
  // run mutation
  // if conflict, send conflict response
  // if accept
  // send accept response
  // send live query updates
  return XXX;
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
