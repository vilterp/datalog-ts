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
  VersionedValue,
} from "./types";
import * as effects from "../../effects";
import { mapObj, pairsToObj } from "../../../../util/util";
import { runMutationClient } from "./mutations/client";

export type QueryStatus = "Loading" | "Online";

export type ClientState = {
  type: "ClientState";
  id: string;
  data: { [key: string]: VersionedValue };
  liveQueries: { [id: string]: { query: Query; status: QueryStatus } };
  transactions: { [id: string]: TransactionRecord };
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
    liveQueries: {},
    mutationDefns,
    transactions: {},
  };
}

export type TransactionState =
  | { type: "Pending" }
  | { type: "Committed" }
  | {
      type: "Aborted";
      serverTrace: Trace;
    };

type TransactionRecord = {
  invocation: MutationInvocation;
  state: TransactionState;
};

function processMutationResponse(
  state: ClientState,
  response: MutationResponse
): [ClientState, MutationRequest | null] {
  const txn = state.transactions[response.id];
  const payload = response.payload;
  const newTxnState: TransactionState =
    payload.type === "Accept"
      ? { type: "Committed" }
      : { type: "Aborted", serverTrace: payload.serverTrace };
  const state1: ClientState = {
    ...state,
    transactions: {
      ...state.transactions,
      [response.id]: {
        ...txn,
        state: newTxnState,
      },
    },
  };
  switch (payload.type) {
    case "Reject":
      console.warn(
        "CLIENT: processMutationResponse: rejected on server",
        payload
      );
      // TODO: roll back & retry?
      return [state1, null];
    case "Accept":
      return [state1, null];
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
                value: update.value,
              };
            default:
              console.warn("CLIENT: unsupported update type:", update);
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
  const txnID = Math.random().toString();
  const [state1, outcome, trace] = runMutationClient(
    state,
    txnID,
    state.mutationDefns[invocation.name],
    invocation.args
  );
  if (outcome === "Abort") {
    console.warn("CLIENT: txn aborted client side");
    return [state1, null];
  }
  const state2: ClientState = {
    ...state1,
    transactions: {
      ...state1.transactions,
      [txnID]: { invocation: invocation, state: { type: "Pending" } },
    },
  };
  const req: MutationRequest = {
    type: "MutationRequest",
    id: txnID,
    invocation: invocation,
    trace: trace,
  };
  return [state2, req];
}

function registerLiveQuery(
  state: ClientState,
  id: string,
  query: Query
): [ClientState, LiveQueryRequest] {
  const newState: ClientState = {
    ...state,
    liveQueries: { ...state.liveQueries, [id]: { query, status: "Loading" } },
  };
  return [newState, { type: "LiveQueryRequest", id, query }];
}

function processLiveQueryResponse(
  state: ClientState,
  resp: LiveQueryResponse
): ClientState {
  const query = state.liveQueries[resp.id];
  return {
    ...state,
    liveQueries: {
      ...state.liveQueries,
      [resp.id]: {
        ...query,
        status: "Online",
      },
    },
    data: {
      ...state.data,
      ...resp.results,
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
          const [newState, req] = registerLiveQuery(state, msg.id, msg.query);
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
