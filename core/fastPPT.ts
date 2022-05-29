import { mapObjToListUnordered } from "../util/util";
import { Bindings, Term } from "./types";

export function fastPPB(bindings: Bindings) {
  return `{${mapObjToListUnordered(
    bindings,
    (k, v) => `${k}: ${fastPPT(v)}`
  ).join(", ")}}`;
}

export function fastPPT(term: Term): string {
  switch (term.type) {
    case "Array":
      return `[${term.items.map(fastPPT).join(", ")}]`;
    case "Bool":
      return term.val.toString();
    case "StringLit":
      return `"${term.val}"`;
    case "IntLit":
      return term.val.toString();
    case "Var":
      return term.name;
    case "Record":
      return `${term.relation}{${mapObjToListUnordered(
        term.attrs,
        (k, v) => `${k}: ${fastPPT(v)}`
      ).join(", ")}}`;
  }
}
