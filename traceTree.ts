import { Tree, leaf, node, prettyPrintTree } from "./treePrinter";
import {
  Res,
  Bindings,
  Term,
  TermWithBindings,
  SituatedBinding,
  RulePathSegment,
  ScopePath,
} from "./types";
import {
  ppt,
  prettyPrintTermWithBindings,
  prettyPrintScopePath,
  ppVM,
} from "./pretty";
import { termEq } from "./unify";
import { mapObj, flatMap } from "./util";
import * as pp from "prettier-printer";
import { pathToScopePath } from "./simpleEvaluate";

export type TracePrintOpts = { showScopePath: boolean };

export const defaultOpts: TracePrintOpts = { showScopePath: false };

export function prettyPrintTrace(res: Res, opts: TracePrintOpts): string {
  return prettyPrintTree(
    traceToTree(res),
    ({ key, path }) =>
      `${key}${
        opts.showScopePath
          ? `; ${pp.render(100, prettyPrintScopePath(pathToScopePath(path)))}`
          : ""
      }`
  );
}

export function traceToTree(res: Res): Tree<Res> {
  const resStr = ppt(res.term);
  switch (res.trace.type) {
    case "AndTrace":
      return node(
        `And`,
        res,
        res.trace.sources.map((s) => traceToTree(s))
      );
    case "MatchTrace":
      return leaf(`Fact: ${printTermWithBindings(res)}`, res);
    case "RefTrace":
      return node(
        // TODO: pretty print invoke loc
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

// returns bindings further down the proof tree, via mappings
// TODO: to this in reverse as well...
export function childPaths(res: Res, binding: string): SituatedBinding[] {
  return childPathsRecurse(res, binding, []);
}

function childPathsRecurse(
  res: Res,
  binding: string,
  path: ScopePath
): SituatedBinding[] {
  const trace = res.trace;
  switch (trace.type) {
    case "RefTrace":
      const mapping = Object.keys(trace.mappings).find(
        (key) => trace.mappings[key] === binding
      );
      if (!mapping) {
        return [];
      }
      console.log("mapping", { binding, mapping });
      return [
        { name: binding, path },
        ...childPathsRecurse(trace.innerRes, mapping, [
          ...path,
          { name: trace.refTerm.relation, invokeLoc: trace.invokeLoc },
        ]),
      ];
    case "AndTrace":
      return flatMap(trace.sources, (innerRes) =>
        childPathsRecurse(innerRes, binding, path)
      );
    case "MatchTrace":
      return [{ name: binding, path }];
    default:
      return [];
  }
}
