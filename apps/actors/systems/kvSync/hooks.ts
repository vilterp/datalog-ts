import { useEffect } from "react";
import { UIProps } from "../../types";
import { ClientState, QueryStatus } from "./client";
import { runQuery } from "./query";
import { MutationInvocation, Query, UserInput, VersionedValue } from "./types";

export type QueryResults = { [key: string]: VersionedValue };

export type Client = {
  state: ClientState;
  runMutation: (mut: MutationInvocation) => void;
  registerLiveQuery: (id: string, query: Query) => void;
};

export function makeClient(props: UIProps<ClientState, UserInput>): Client {
  const runMutation = (mutation: MutationInvocation) => {
    props.sendUserInput({ type: "RunMutation", invocation: mutation });
  };
  const registerLiveQuery = (id: string, query: Query) => {
    props.sendUserInput({ type: "RegisterQuery", id, query });
  };
  return {
    state: props.state,
    runMutation,
    registerLiveQuery,
  };
}

export function useLiveQuery(
  client: Client,
  id: string,
  query: Query
): [QueryResults, QueryStatus] {
  useEffect(() => {
    client.registerLiveQuery(id, query);
  }, []);

  const results = runQuery(client.state.data, query);
  const queryMetadata = client.state.liveQueries[id];
  const status: QueryStatus = queryMetadata ? queryMetadata.status : "Loading";
  return [results, status];
}
