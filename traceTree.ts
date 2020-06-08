import { Tree, leaf, node, prettyPrintTree } from "./treePrinter";
import { Res, Bindings, Term, TermWithBindings } from "./types";
import { ppt, prettyPrintTermWithBindings, ppVM } from "./pretty";
import { termEq } from "./unify";
import { mapObj } from "./util";
import * as pp from "prettier-printer";

export function prettyPrintTrace(res: Res): string {
  return prettyPrintTree(traceToTree(res));
}

export function traceToTree(res: Res): Tree<Res> {
  const resStr = ppt(res.term);
  switch (res.trace.type) {
    case "AndTrace":
      return node(`And`, res, res.trace.sources.map(traceToTree));
    case "MatchTrace":
      return leaf(`Fact: ${printTermWithBindings(res)}`, res);
    case "RefTrace":
      return node(
        `Rule: ${printTermWithBindings(res)}; ${ppVM(res.trace.mappings)}`,
        res,
        [traceToTree(res.trace.innerRes)]
      );
    case "VarTrace":
      return leaf(`var: ${resStr}`, res);
    case "BinExprTrace":
      return leaf(`bin_expr: ${resStr}`, res);
    case "BaseFactTrace":
      return leaf(`base_fact: ${resStr}`, res);
    case "LiteralTrace":
      return leaf(`literal: ${resStr}`, res);
  }
}

function printTermWithBindings(res: Res): string {
  return pp.render(
    100,
    prettyPrintTermWithBindings(makeTermWithBindings(res.term, res.bindings))
  );
}

function makeTermWithBindings(
  term: Term,
  bindings: Bindings
): TermWithBindings {
  switch (term.type) {
    case "Record":
      return {
        type: "RecordWithBindings",
        relation: term.relation,
        attrs: mapObj(term.attrs, (_, val) => {
          const binding = Object.keys(bindings).find((b) =>
            termEq(val, bindings[b])
          );
          return {
            term: makeTermWithBindings(val, bindings),
            binding: binding,
          };
        }),
      };
    case "Array":
      return {
        type: "ArrayWithBindings",
        items: term.items.map((item) => makeTermWithBindings(item, bindings)),
      };
    case "BinExpr":
      return {
        type: "BinExprWithBindings",
        left: makeTermWithBindings(term.left, bindings),
        op: term.op,
        right: makeTermWithBindings(term.right, bindings),
      };
    default:
      return { type: "Atom", term };
  }
}
