import { useEffect } from "react";
import { UIProps } from "../../types";
import { ClientState, QueryStatus } from "./client";
import { runQuery } from "./query";
import { Query, UserInput, VersionedValue } from "./types";
import { Json } from "../../../../util/json";

export type QueryResults = { [key: string]: VersionedValue };

export type Client = {
  state: ClientState;
  login(username: string, password: string): void;
  signup(username: string, password: string): void;
  logout(): void;
  runMutation(name: string, args: Json[]): void;
  registerLiveQuery(id: string, query: Query): void;
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
  const registerLiveQuery = (id: string, query: Query) => {
    // don't register duplicate query
    // TODO: key these on query itself; get rid of id
    if (props.state.liveQueries[id]) {
      return;
    }
    props.sendUserInput({ type: "RegisterQuery", id, query });
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
  client: Client,
  id: string,
  query: Query
): [QueryResults, QueryStatus] {
  // TODO: try to get rid of id; usse query itself as key
  useEffect(() => {
    client.registerLiveQuery(id, query);
  }, [id]);

  const results = runQuery(client.state.data, query);
  const queryMetadata = client.state.liveQueries[id];
  const status: QueryStatus = queryMetadata ? queryMetadata.status : "Loading";
  return [results, status];
}
