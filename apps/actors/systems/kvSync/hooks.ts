import { useEffect } from "react";
import { filterObj } from "../../../../util/util";
import { UIProps } from "../../types";
import { ClientState, QueryStatus } from "./client";
import {
  keyInQuery,
  MutationInvocation,
  Query,
  UserInput,
  VersionedValue,
} from "./types";

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

  const results = runQuery(client.state, query);
  const queryMetadata = client.state.liveQueries[id];
  const status: QueryStatus = queryMetadata ? queryMetadata.status : "Loading";
  return [results, status];
}

// TODO: find a better home for this
function runQuery(state: ClientState, query: Query): QueryResults {
  return filterObj(state.data, (k, v) => keyInQuery(k, query));
}
