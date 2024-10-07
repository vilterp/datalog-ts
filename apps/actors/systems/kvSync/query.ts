import { Json } from "../../../../util/json";
import { KVApp } from "./kvApp";
import { QueryCtx, QueryInvocation, Trace } from "./types";

export function keyInTrace(key: string, trace: Trace): boolean {
  for (const op of trace) {
    if (op.key === key) {
      return true;
    }
  }

  return false;
}

export function runQuery(
  app: KVApp,
  ctx: QueryCtx,
  invocation: QueryInvocation
): [Json, Trace] {
  const query = app.queries[invocation.name];
  if (!query) {
    throw new Error(`Query not found: ${invocation.name}`);
  }

  const res = query(ctx, invocation.args) as Json;

  return [res, ctx.trace];
}
