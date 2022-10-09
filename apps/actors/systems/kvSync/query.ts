import { filterObj } from "../../../../util/util";
import { QueryResults } from "./hooks";
import { KVData, Query } from "./types";

export function keyInQuery(key: string, query: Query): boolean {
  return key.startsWith(query.prefix);
}

export function runQuery(data: KVData, query: Query): QueryResults {
  return filterObj(data, (k, v) => keyInQuery(k, query));
}
