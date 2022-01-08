import { mapObjToListUnordered } from "../../util/util";
import { Term } from "../types";

export function fastPPT(term: Term): string {
  switch (term.type) {
    case "Array":
      return `[${term.items.map(fastPPT).join(",")}]`;
    case "BinExpr":
      return `${fastPPT(term.left)} ${term.op} ${term.right}`;
    case "Bool":
      return term.val.toString();
    case "StringLit":
      return term.val;
    case "IntLit":
      return term.val.toString();
    case "Var":
      return term.name;
    case "Record":
      return `${term.relation}{${mapObjToListUnordered(
        term.attrs,
        (k, v) => `${k}:${fastPPT(v)}`
      )}}`;
  }
}
