import { ActorResp, LoadedTickInitiator } from "../../types";
import {
  ConflictingKeys,
  LiveQueryRequest,
  LiveQueryResponse,
  LiveQueryUpdate,
  MsgToClient,
  MsgToServer,
  MutationDefns,
  MutationInvocation,
  MutationRequest,
  MutationResponse,
  Query,
} from "./types";
import * as effects from "../../effects";

export type ClientState = {
  type: "ClientState";
  id: string;
  data: { [key: string]: ClientValue };
  liveQueries: Query[];
  nextMutationID: number;
  mutations: MutationState[]; // TODO: index
  mutationDefns: MutationDefns;
};

export function initialClientState(
  id: string,
  mutationDefns: MutationDefns
): ClientState {
  return {
    type: "ClientState",
    data: {},
    id,
    liveQueries: [],
    mutationDefns,
    mutations: [],
    nextMutationID: 0,
  };
}

type ClientValue = {
  version: number;
  value: string;
  serverTimestamp: number | null;
};

// rename "TransactionState"?
type MutationState = {
  id: string;
  mutation: MutationInvocation;
  state:
    | { type: "Pending" }
    | { type: "Applied"; serverTimestamp: number }
    | {
        type: "Rejected";
        conflictingKeys: ConflictingKeys;
      };
};

function processMutationResponse(
  state: ClientState,
  response: MutationResponse
): [ClientState, MutationRequest | null] {
  // update state in mutations list
  // if accepted, apply kv updates
  // if conflict, retry
  return XXX;
}

function processLiveQueryUpdate(
  state: ClientState,
  update: LiveQueryUpdate
): ClientState {
  return XXX;
}

function runMutationOnClient(
  state: ClientState,
  mutation: MutationInvocation
): [ClientState, MutationRequest] {
  // apply to client
  // put mutation in list with state Pending
  // return mutation request
  return XXX;
}

function registerLiveQuery(
  state: ClientState,
  query: Query
): [ClientState, LiveQueryRequest] {
  return XXX;
}

function processLiveQueryResponse(
  state: ClientState,
  resp: LiveQueryResponse
): ClientState {
  return XXX;
}

// TODO: maybe move this out to index.ts? idk
export function updateClient(
  state: ClientState,
  init: LoadedTickInitiator<ClientState, MsgToClient>
): ActorResp<ClientState, MsgToServer> {
  switch (init.type) {
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        // from server
        case "MutationResponse": {
          const [newState, resp] = processMutationResponse(state, msg);
          if (resp == null) {
            return effects.updateState(newState);
          }
          return effects.reply(init, newState, resp);
        }
        case "LiveQueryResponse": {
          return effects.updateState(processLiveQueryResponse(state, msg));
        }
        case "LiveQueryUpdate": {
          return effects.updateState(processLiveQueryUpdate(state, msg));
        }
        // user input
        case "RegisterQuery": {
          const [newState, req] = registerLiveQuery(state, msg.query);
          return effects.updateAndSend(newState, [{ to: "server", msg: req }]);
        }
        case "RunMutation": {
          const [newState, req] = runMutationOnClient(state, {
            name: msg.name,
            args: msg.args,
          });
          return effects.updateAndSend(newState, [
            {
              to: "server",
              msg: req,
            },
          ]);
        }
      }
    }
    default:
      return effects.updateState(state);
  }
}
