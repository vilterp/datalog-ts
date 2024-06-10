import { MutationInvocation } from "../types";

export function prettyPrintInvocation(invocation: MutationInvocation) {
  return `${invocation.name}(${invocation.args
    .map((arg) => JSON.stringify(arg))
    .join(", ")})`;
}
