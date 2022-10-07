import { ActorResp, LoadedTickInitiator } from "../../types";
import {
  KVData,
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
  TransactionMetadata,
} from "./types";
import * as effects from "../../effects";
import { mapObj, pairsToObj, randStep } from "../../../../util/util";
import { runMutation } from "./mutations/run";

export type QueryStatus = "Loading" | "Online";

export type ClientState = {
  type: "ClientState";
  data: KVData;
  liveQueries: { [id: string]: { query: Query; status: QueryStatus } };
  transactions: { [id: string]: TransactionRecord };
  mutationDefns: MutationDefns;
  randSeed: number;
};

export function initialClientState(
  mutationDefns: MutationDefns,
  randSeed: number
): ClientState {
  return {
    type: "ClientState",
    data: {},
    liveQueries: {},
    mutationDefns,
    transactions: {},
    randSeed,
  };
}

export type TransactionState =
  | { type: "Pending" }
  | { type: "Committed"; serverTimestamp: number }
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
  const txn = state.transactions[response.txnID];
  const payload = response.payload;
  const newTxnState: TransactionState =
    payload.type === "Accept"
      ? { type: "Committed", serverTimestamp: payload.timestamp }
      : { type: "Aborted", serverTrace: payload.serverTrace };
  const state1: ClientState = {
    ...state,
    transactions: {
      ...state.transactions,
      [response.txnID]: {
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
    transactions: {
      ...state.transactions,
      ...getNewTransactions(update.transactionMetadata),
    },
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
  const randNum = randStep(state.randSeed);
  const txnID = randNum.toString();
  const [data1, outcome, trace] = runMutation(
    state.data,
    txnID,
    state.mutationDefns[invocation.name],
    invocation.args
  );
  const state1: ClientState = { ...state, data: data1 };
  if (outcome === "Abort") {
    console.warn("CLIENT: txn aborted client side");
    return [state1, null];
  }
  const state2: ClientState = {
    ...state1,
    randSeed: randNum,
    transactions: {
      ...state1.transactions,
      [txnID]: { invocation: invocation, state: { type: "Pending" } },
    },
  };
  const req: MutationRequest = {
    type: "MutationRequest",
    txnID,
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

function getNewTransactions(metadata: TransactionMetadata): {
  [id: string]: TransactionRecord;
} {
  return mapObj(
    metadata,
    (txnid, metadata): TransactionRecord => ({
      state: {
        type: "Committed",
        serverTimestamp: metadata.serverTimestamp,
      },
      invocation: metadata.invocation,
    })
  );
}

function processLiveQueryResponse(
  state: ClientState,
  resp: LiveQueryResponse
): ClientState {
  const query = state.liveQueries[resp.id];
  const newTransactions = getNewTransactions(resp.transactionMetadata);
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
    transactions: {
      ...state.transactions,
      ...newTransactions,
    },
  };
}

export function getStateForKey(
  state: ClientState,
  key: string
): TransactionState {
  const value = state.data[key];
  const txn = state.transactions[value.transactionID];
  return txn.state;
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
