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
import { mapObj } from "../../../../util/util";
import { runMutation } from "./runMutation";

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
  invocation: MutationInvocation
): [ClientState, MutationRequest | null] {
  const [state1, outcome, trace] = runMutation(
    state,
    state.mutationDefns[invocation.name],
    invocation.args
  );
  if (outcome === "Abort") {
    console.warn("aborted on client side");
    return [state1, null];
  }
  const state2: ClientState = {
    ...state1,
    mutations: [
      ...state1.mutations,
      { mutation: invocation, state: { type: "Pending" } },
    ],
  };
  const req: MutationRequest = {
    type: "MutationRequest",
    mutation: invocation,
    trace: trace,
  };
  return [state2, req];
}

function registerLiveQuery(
  state: ClientState,
  query: Query
): [ClientState, LiveQueryRequest] {
  const newState: ClientState = {
    ...state,
    liveQueries: [...state.liveQueries, query],
  };
  return [newState, { type: "LiveQueryRequest", query }];
}

function processLiveQueryResponse(
  state: ClientState,
  resp: LiveQueryResponse
): ClientState {
  return {
    ...state,
    data: {
      ...state.data,
      ...mapObj(resp.results, (key, value) => ({
        version: value.version,
        value: value.value,
        serverTimestamp: value.serverTimestamp,
      })),
    },
  };
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
