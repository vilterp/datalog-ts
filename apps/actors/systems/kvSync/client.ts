import { ActorResp, LoadedTickInitiator } from "../../types";
import {
  AbortReason,
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
  WriteOp,
} from "./types";
import * as effects from "../../effects";
import { mapObj, pairsToObj, randStep } from "../../../../util/util";
import { runMutation } from "./mutations/run";
import { InterpreterState } from "./mutations/builtins";

export type QueryStatus = "Loading" | "Online";

export type LiveQuery = { query: Query; status: QueryStatus };

export type ClientState = {
  type: "ClientState";
  id: string;
  data: KVData;
  loginState: LoginState;
  liveQueries: { [id: string]: LiveQuery };
  transactions: { [id: string]: TransactionRecord };
  mutationDefns: MutationDefns;
  randSeed: number;
  time: number;
};

export type LoginState =
  | { type: "LoggedOut"; loggingInAs: string | null }
  | { type: "LoggedIn"; username: string; token: string; loggingOut: boolean };

export function initialClientState(
  clientID: string,
  mutationDefns: MutationDefns,
  randSeed: number
): ClientState {
  return {
    type: "ClientState",
    id: clientID,
    loginState: { type: "LoggedOut", loggingInAs: null },
    data: {},
    liveQueries: {},
    mutationDefns,
    transactions: {},
    randSeed,
    time: 0,
  };
}

export type TransactionState =
  | { type: "Pending"; sentTime: number }
  | { type: "Committed"; serverTimestamp: number }
  | {
      type: "Aborted";
      reason: AbortReason;
      serverTimestamp: number;
      serverTrace: Trace;
    };

export type TransactionRecord = {
  invocation: MutationInvocation;
  clientTrace: Trace;
  writes: WriteOp[];
  state: TransactionState;
};

function processMutationResponse(
  state: ClientState,
  response: MutationResponse
): ClientState {
  const txn = state.transactions[response.txnID];
  const payload = response.payload;
  const newTxnState: TransactionState =
    payload.type === "Accept"
      ? { type: "Committed", serverTimestamp: payload.timestamp }
      : {
          type: "Aborted",
          reason: payload.reason,
          serverTimestamp: payload.timestamp,
          serverTrace: payload.serverTrace,
        };
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
      return state1;
    case "Accept":
      return state1;
  }
}

function processLiveQueryUpdate(
  state: ClientState,
  updateMsg: LiveQueryUpdate
): ClientState {
  const newData = { ...state.data };
  for (const [key, update] of Object.entries(updateMsg.updates)) {
    switch (update.type) {
      case "Updated":
        newData[key] = [...newData[key], update.value];
        break;
      case "Deleted":
        delete newData[key]; // TODO: tombstone?
        break;
    }
  }

  return {
    ...state,
    transactions: {
      ...state.transactions,
      ...getNewTransactions(updateMsg.transactionMetadata),
    },
    data: newData,
  };
}

function runMutationOnClient(
  state: ClientState,
  invocation: MutationInvocation,
  username: string
): [ClientState, MutationRequest | null] {
  const randNum = randStep(state.randSeed);
  const txnID = randNum.toString();
  const initialInterpState: InterpreterState = {
    type: "InterpreterState",
    randSeed: randStep(randNum),
  };
  const isTxnCommitted = (txnID: string) =>
    state.transactions[txnID].state.type === "Committed";
  const [data1, resVal, newInterpState, outcome, trace] = runMutation(
    state.data,
    initialInterpState,
    txnID,
    state.mutationDefns[invocation.name],
    invocation.args,
    username,
    isTxnCommitted
  );
  const state1: ClientState = {
    ...state,
    randSeed: newInterpState.randSeed,
    data: data1,
  };
  const writes = [];
  if (outcome === "Abort") {
    console.warn("CLIENT: txn aborted client side:", resVal, trace);
    const state2 = addTransaction(state1, txnID, {
      invocation,
      clientTrace: trace,
      writes,
      state: {
        type: "Aborted",
        // TODO: pretty print values
        reason: { type: "FailedOnClient", reason: JSON.stringify(resVal) },
        // TODO: this is not actually the server trace; is that ok?
        serverTrace: trace,
        serverTimestamp: state.time,
      },
    });
    return [state2, null];
  }

  const state2 = addTransaction(state1, txnID, {
    invocation,
    clientTrace: trace,
    writes,
    state: { type: "Pending", sentTime: state.time },
  });

  const req: MutationRequest = {
    type: "MutationRequest",
    txnID,
    interpState: initialInterpState,
    invocation,
    trace: trace,
  };
  return [state2, req];
}

function addTransaction(
  state: ClientState,
  txnID: string,
  txn: TransactionRecord
): ClientState {
  return {
    ...state,
    transactions: {
      ...state.transactions,
      [txnID]: txn,
    },
  };
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
      clientTrace: [],
      state: {
        type: "Committed",
        serverTimestamp: metadata.serverTimestamp,
      },
      writes: [],
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

  let newData = { ...state.data };
  for (const [key, value] of Object.entries(resp.results)) {
    // add latest transaction onto the end
    // TODO: GC old transactions
    newData[key] = { ...newData[key], ...value };
  }

  return {
    ...state,
    liveQueries: {
      ...state.liveQueries,
      [resp.id]: {
        ...query,
        status: "Online",
      },
    },
    data: newData,
    transactions: {
      ...state.transactions,
      ...newTransactions,
    },
  };
}

export function updateClient(
  state: ClientState,
  init: LoadedTickInitiator<ClientState, MsgToClient>
): ActorResp<ClientState, MsgToServer> {
  const resp = updateClientInner(state, init);
  switch (resp.type) {
    case "continue": {
      return {
        ...resp,
        state: incrementTime(resp.state),
      };
    }
    default:
      return resp;
  }
}

function updateClientInner(
  state: ClientState,
  init: LoadedTickInitiator<ClientState, MsgToClient>
): ActorResp<ClientState, MsgToServer> {
  switch (init.type) {
    case "messageReceived": {
      const msg = init.payload;
      switch (msg.type) {
        // ==== from server ====

        // Auth

        case "SignupResponse": {
          if (msg.response.type === "Failure") {
            console.warn("CLIENT: signup failed");
            // TODO: store error in state
            return effects.updateState({
              ...state,
              loginState: { type: "LoggedOut", loggingInAs: null },
            });
          }
          if (state.loginState.type !== "LoggedOut") {
            console.warn("CLIENT: already logged in");
            return effects.updateState(state);
          }
          if (state.loginState.loggingInAs === null) {
            console.warn("CLIENT: no user to log in as");
            return effects.updateState(state);
          }

          return effects.updateState({
            ...state,
            loginState: {
              type: "LoggedIn",
              username: state.loginState.loggingInAs,
              token: msg.response.token,
              loggingOut: false,
            },
          });
        }
        case "LogInResponse": {
          if (msg.response.type === "Failure") {
            console.warn("CLIENT: login failed");
            // TODO: store error in state
            return effects.updateState({
              ...state,
              loginState: { type: "LoggedOut", loggingInAs: null },
            });
          }

          if (state.loginState.type !== "LoggedOut") {
            console.warn("CLIENT: already logged in");
            return effects.updateState(state);
          }
          if (state.loginState.loggingInAs === null) {
            console.warn("CLIENT: no user to log in as");
            return effects.updateState(state);
          }

          return effects.updateState({
            ...state,
            loginState: {
              type: "LoggedIn",
              username: state.loginState.loggingInAs,
              token: msg.response.token,
              loggingOut: false,
            },
          });
        }
        case "LogOutResponse": {
          return effects.updateState({
            ...state,
            loginState: { type: "LoggedOut", loggingInAs: null },
          });
        }

        // Queries & Mutations

        case "MutationResponse": {
          const newState = processMutationResponse(state, msg);
          return effects.updateState(newState);
        }
        case "LiveQueryResponse": {
          return effects.updateState(processLiveQueryResponse(state, msg));
        }
        case "LiveQueryUpdate": {
          return effects.updateState(processLiveQueryUpdate(state, msg));
        }

        // ==== user input ===

        // Auth

        case "Signup": {
          const newState: ClientState = {
            ...state,
            loginState: { type: "LoggedOut", loggingInAs: msg.username },
          };
          return effects.updateAndSend(newState, [
            {
              to: "server",
              msg: {
                type: "SignupRequest",
                username: msg.username,
                password: msg.password,
              },
            },
          ]);
        }
        case "Login": {
          const newState: ClientState = {
            ...state,
            loginState: { type: "LoggedOut", loggingInAs: msg.username },
          };
          return effects.updateAndSend(newState, [
            {
              to: "server",
              msg: {
                type: "LogInRequest",
                username: msg.username,
                password: msg.password,
              },
            },
          ]);
        }
        case "Logout": {
          if (state.loginState.type === "LoggedOut") {
            console.warn("CLIENT: already logged out");
            return effects.updateState(state);
          }

          const newState: ClientState = {
            ...state,
            loginState: { ...state.loginState, loggingOut: true },
          };

          return effects.updateAndSend(newState, [
            {
              to: "server",
              msg: {
                type: "AuthenticatedRequest",
                token: state.loginState.token,
                request: { type: "LogOutRequest" },
              },
            },
          ]);
        }

        // Queries & Mutations

        case "RegisterQuery": {
          const [newState, req] = registerLiveQuery(state, msg.id, msg.query);
          if (state.loginState.type === "LoggedOut") {
            console.warn("CLIENT: must be logged in to register query");
            return effects.updateState(state);
          }

          return effects.updateAndSend(newState, [
            {
              to: "server",
              msg: {
                type: "AuthenticatedRequest",
                token: state.loginState.token,
                request: req,
              },
            },
          ]);
        }
        case "RunMutation": {
          if (state.loginState.type === "LoggedOut") {
            console.warn("CLIENT: must be logged in to run mutation");
            return effects.updateState(state);
          }

          const [newState, req] = runMutationOnClient(
            state,
            {
              type: "Invocation",
              name: msg.invocation.name,
              args: msg.invocation.args,
            },
            state.loginState.username
          );
          if (req === null) {
            return effects.updateState(newState);
          }

          return effects.updateAndSend(newState, [
            {
              to: "server",
              msg: {
                type: "AuthenticatedRequest",
                token: state.loginState.token,
                request: req,
              },
            },
          ]);
        }
        case "CancelTransaction":
          console.warn("TODO: implement cancel transaction");
          // what should this even mean
          return effects.updateState(state);
      }
    }
    default:
      return effects.updateState(state);
  }
}

function incrementTime(state: ClientState): ClientState {
  return { ...state, time: state.time + 1 };
}
