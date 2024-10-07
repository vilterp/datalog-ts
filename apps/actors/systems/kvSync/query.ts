import { KVApp } from "./examples/types";
import { QueryResults } from "./hooks";
import { KVData, Query, QueryCtx, QueryInvocation, Trace } from "./types";

export function keyInQuery(key: string, query: Query): boolean {
  return key.startsWith(query.prefix);
}

export function runQuery(
  app: KVApp,
  ctx: QueryCtx,
  invocation: QueryInvocation
): [QueryResults, Trace] {
  const query = app.queries[invocation.name];
  const res = query(ctx);

  return [res, ctx.trace];
}
