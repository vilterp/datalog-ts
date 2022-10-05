import { useEffect } from "react";
import { filterObj } from "../../../../util/util";
import { Client, ClientValue } from "./client";
import { keyInQuery, Query } from "./types";

export function useLiveQuery(
  client: Client,
  query: Query
): { [key: string]: ClientValue } {
  useEffect(() => {
    client.transport({
      type: "LiveQueryRequest",
      query: query,
    });
  }, [query]);

  return filterObj(client.state.data, (k, v) => keyInQuery(k, query));
}
