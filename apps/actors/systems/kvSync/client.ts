import { ActorResp, LoadedTickInitiator } from "../../types";
import {
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
  Trace,
} from "./types";
import * as effects from "../../effects";
import { mapObj, pairsToObj } from "../../../../util/util";
import { runMutationClient } from "./mutations/client";
import { Json } from "../../../../util/json";

export type Client = {
  state: ClientState;
  runMutation: (mut: MutationInvocation) => void;
};

function makeClient(
  state: ClientState,
  transport: (msg: MsgToServer) => void
) {}

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

export type ClientValue = {
  version: number;
  value: Json;
  serverTimestamp: number | null;
};

// rename "TransactionState"?
type MutationState = {
  invocation: MutationInvocation;
  state:
    | { type: "Pending" }
    | { type: "Applied"; serverTimestamp: number }
    | {
        type: "Rejected";
        clientTrace: Trace;
        serverTrace: Trace;
      };
};

function processMutationResponse(
  state: ClientState,
  response: MutationResponse
): [ClientState, MutationRequest | null] {
  // TODO: update mutation state
  const payload = response.payload;
  switch (payload.type) {
    case "Aborted":
      console.warn("processMutationResponse: aborted on server", payload);
      // TODO: roll back?
      return [state, null];
    case "Reject":
      console.warn("processMutationResponse: rejected on server", payload);
      // TODO: roll back & retry?
      return [state, null];
    case "Accept":
      return [state, null];
  }
}

function processLiveQueryUpdate(
  state: ClientState,
  update: LiveQueryUpdate
): ClientState {
  return {
    ...state,
    data: {
      ...state.data,
      ...pairsToObj(
        update.updates.map((update) => {
          switch (update.type) {
            case "Updated":
              return {
                key: update.key,
                value: {
                  version: update.newVersion,
                  value: update.value,
                  serverTimestamp: null, // TODO: sort these out
                },
              };
            default:
              console.warn("unsupported update type:", update);
          }
        })
      ),
    },
  };
}

function runMutationOnClient(
  state: ClientState,
  invocation: MutationInvocation
): [ClientState, MutationRequest | null] {
  const [state1, outcome, trace] = runMutationClient(
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
      { invocation: invocation, state: { type: "Pending" } },
    ],
  };
  const req: MutationRequest = {
    type: "MutationRequest",
    invocation: invocation,
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
          if (req === null) {
            return effects.updateState(newState);
          }
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
