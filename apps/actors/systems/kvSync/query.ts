import { QueryResults } from "./hooks";
import { getVisibleValue } from "./mutations/common";
import { KVData, Query } from "./types";

export function keyInQuery(key: string, query: Query): boolean {
  return key.startsWith(query.prefix);
}

export function runQuery(
  txnIsCommitted: (txnID: string) => boolean,
  data: KVData,
  query: Query
): QueryResults {
  const out: QueryResults = {};
  for (const key in data) {
    if (keyInQuery(key, query)) {
      const res = getVisibleValue(txnIsCommitted, data, key);
      if (res !== null) {
        out[key] = res;
      }
    }
  }

  return out;
}
