import { useEffect } from "react";
import { UIProps } from "../../types";
import { ClientState, isTxnVisible, QueryStatus } from "./client";
import { runQuery } from "./query";
import { QueryCtx, QueryInvocation, queryToString, UserInput } from "./types";
import { Json } from "../../../../util/json";
import { MutationContextImpl } from "./common";
import { KVApp } from "./kvApp";

export type Client = {
  state: ClientState;
  login(username: string, password: string): void;
  signup(username: string, password: string): void;
  logout(): void;
  runMutation(name: string, args: Json[]): void;
  registerLiveQuery(invocation: QueryInvocation): void;
  cancelTransaction(id: string): void;
  retryTransaction(id: string): void;
};

export function makeClient(props: UIProps<ClientState, UserInput>): Client {
  const runMutation = (name: string, args: Json[]) => {
    props.sendUserInput({
      type: "RunMutation",
      invocation: { type: "Invocation", name, args },
    });
  };
  const registerLiveQuery = (invocation: QueryInvocation) => {
    const id = queryToString(invocation);
    // don't register duplicate query
    // TODO: key these on query itself; get rid of id
    if (props.state.liveQueries[id]) {
      return;
    }
    props.sendUserInput({ type: "RegisterQuery", invocation });
  };
  const cancelTransaction = (id: string) => {
    props.sendUserInput({ type: "CancelTransaction", id });
  };
  const retryTransaction = (id: string) => {
    const invocation = props.state.transactions[id].invocation;
    props.sendUserInput({ type: "RunMutation", invocation });
  };
  const signup = (username: string, password: string) => {
    props.sendUserInput({ type: "Signup", username, password });
  };
  const login = (username: string, password: string) => {
    props.sendUserInput({ type: "Login", username, password });
  };
  const logout = () => {
    props.sendUserInput({ type: "Logout" });
  };
  return {
    state: props.state,
    signup,
    login,
    logout,
    runMutation,
    registerLiveQuery,
    cancelTransaction,
    retryTransaction,
  };
}

export function useLiveQuery(
  app: KVApp,
  client: Client,
  invocation: QueryInvocation
): [Json, QueryStatus] {
  const queryID = queryToString(invocation);
  // TODO: try to get rid of id; usse query itself as key
  useEffect(() => {
    client.registerLiveQuery(invocation);
  }, [queryID]);

  const isVisible = (txnID) => isTxnVisible(client.state, txnID);

  const txnID = client.state.randSeed.toString();
  const ctx: QueryCtx = new MutationContextImpl(
    txnID,
    client.state.loginState.type === "LoggedIn"
      ? client.state.loginState.username
      : "",
    client.state.data,
    isVisible,
    client.state.randSeed
  );

  const [results, trace] = runQuery(app, ctx, invocation);
  const queryMetadata = client.state.liveQueries[queryID];
  const status: QueryStatus = queryMetadata ? queryMetadata.status : "Loading";
  return [results, status];
}
