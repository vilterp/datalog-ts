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
  data: { [key: string]: VersionedValue };
  liveQueries: { clientID: string; query: Query }[]; // TODO: index
  mutationDefns: MutationDefns;
};

export const initialServerState: ServerState = {
  type: "ServerState",
  data: {},
  liveQueries: [],
  mutationDefns: {},
};

function processLiveQueryRequest(
  state: ServerState,
  req: LiveQueryRequest
): [ServerState, LiveQueryResponse] {
  return XXX;
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

export function updateServer(
  state: ServerState,
  init: LoadedTickInitiator<ServerState, MsgToServer>
): ActorResp<ServerState, MsgToClient> {
  switch (init.type) {
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        case "LiveQueryRequest": {
          const [newState, resp] = processLiveQueryRequest(state, msg);
          return effects.updateAndSend(newState, [
            { to: init.from, msg: resp },
          ]);
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
