import { Tree, leaf, node, prettyPrintTree } from "./treePrinter";
import { Res, Bindings, Term, TermWithBindings } from "./types";
import {
  ppt,
  prettyPrintTermWithBindings,
  prettyPrintRulePath,
  ppVM,
  prettyPrintInvokeLoc,
} from "./pretty";
import { termEq } from "./unify";
import { mapObj } from "./util";
import * as pp from "prettier-printer";

export type TracePrintOpts = { printInvokeLoc: boolean };

export const defaultOpts: TracePrintOpts = { printInvokeLoc: false };

export function prettyPrintTrace(res: Res, opts: TracePrintOpts): string {
  return prettyPrintTree(traceToTree(res, opts));
}

export function traceToTree(res: Res, opts: TracePrintOpts): Tree<Res> {
  const resStr = ppt(res.term);
  switch (res.trace.type) {
    case "AndTrace":
      return node(
        `And`,
        res,
        res.trace.sources.map((s) => traceToTree(s, opts))
      );
    case "MatchTrace":
      return leaf(`Fact: ${printTermWithBindings(res)}`, res);
    case "RefTrace":
      return node(
        // TODO: pretty print invoke loc
        `Rule: ${printTermWithBindings(res)}; ${ppVM(res.trace.mappings)}${
          opts.printInvokeLoc
            ? `; ${pp.render(100, prettyPrintInvokeLoc(res.trace.invokeLoc))}`
            : ""
        }`,
        res,
        [traceToTree(res.trace.innerRes, opts)]
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

export function makeTermWithBindings(
  term: Term,
  bindings: Bindings
): TermWithBindings {
  switch (term.type) {
    case "Record":
      return {
        type: "RecordWithBindings",
        relation: term.relation,
        attrs: mapObj(term.attrs, (_, val) => {
          const binding = Object.keys(bindings).find((b) => {
            return bindings[b] && termEq(val, bindings[b]);
          });
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
