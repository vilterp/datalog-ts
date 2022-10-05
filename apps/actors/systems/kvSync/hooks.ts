import { useEffect } from "react";
import { filterObj } from "../../../../util/util";
import { ClientState, QueryStatus } from "./client";
import { keyInQuery, Query, UserInput, VersionedValue } from "./types";

export type QueryResults = { [key: string]: VersionedValue };

export function useLiveQuery(
  state: ClientState,
  id: string,
  query: Query,
  sendUserInput: (i: UserInput) => void
): [QueryResults, QueryStatus] {
  useEffect(() => {
    sendUserInput({
      type: "RegisterQuery",
      id,
      query: query,
    });
  }, []);

  const results = runQuery(state, query);
  const queryMetadata = state.liveQueries[id];
  const status: QueryStatus = queryMetadata ? queryMetadata.status : "Loading";
  return [results, status];
}

// TODO: find a better home for this
function runQuery(state: ClientState, query: Query): QueryResults {
  return filterObj(state.data, (k, v) => keyInQuery(k, query));
}
