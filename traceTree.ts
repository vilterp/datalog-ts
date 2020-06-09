import { Tree, leaf, node, prettyPrintTree } from "./treePrinter";
import {
  Res,
  Bindings,
  Term,
  TermWithBindings,
  SituatedBinding,
  ScopePath,
  VarMappings,
} from "./types";
import {
  ppt,
  prettyPrintTermWithBindings,
  prettyPrintScopePath,
  ppVM,
} from "./pretty";
import { termEq } from "./unify";
import { mapObj, flatMap, getFirst, lastItem } from "./util";
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
        collapseAndSources(res.trace.sources).map((s) => traceToTree(s))
      );
    case "MatchTrace":
      return leaf(printTermWithBindings(res), res);
    case "RefTrace": {
      const innerRes = res.trace.innerRes;
      return node(
        `${printTermWithBindings(res)}; ${ppVM(res.trace.mappings)}`,
        res,
        innerRes.trace.type === "AndTrace"
          ? collapseAndSources(innerRes.trace.sources).map((s) =>
              traceToTree(s)
            )
          : [traceToTree(innerRes)]
      );
    }
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

function collapseAndSources(sources: Res[]): Res[] {
  if (sources.length === 2 && sources[1].trace.type === "AndTrace") {
    return [sources[0], ...collapseAndSources(sources[1].trace.sources)];
  }
  return sources;
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

type PathSeg = {
  res: Res;
  rule: string;
  path: ScopePath;
  mappings: VarMappings;
};

// returns [leat => root]
// TODO: just pass down list and index?
function walkPath(
  res: Res,
  mappings: VarMappings,
  soFar: ScopePath,
  path: ScopePath
): PathSeg[] {
  // console.log("walkPath", { res, soFar, path });
  if (path.length === 0) {
    return [{ res, mappings, path: soFar, rule: "" }];
  }
  switch (res.trace.type) {
    case "AndTrace": {
      const firstSeg = path[0];
      const clauseIdx = getFirst(firstSeg.invokeLoc, (seg) =>
        seg.type === "AndClause" ? seg.idx : null
      );
      return walkPath(res.trace.sources[clauseIdx], mappings, soFar, path);
    }
    case "RefTrace": {
      const firstSeg = path[0];
      return [
        ...walkPath(
          res.trace.innerRes,
          res.trace.mappings,
          [...soFar, firstSeg],
          path.slice(1)
        ),
        {
          res,
          rule: res.trace.refTerm.relation,
          path: soFar,
          mappings,
        },
      ];
    }
    case "MatchTrace":
      return [];
    default:
      throw new Error("unreachable");
  }
}

// TODO: also get "parent" paths
export function getRelatedPaths(
  res: Res,
  highlighted: SituatedBinding
): { parents: SituatedBinding[]; children: SituatedBinding[] } {
  // console.log("===========");
  const path = walkPath(res, {}, [], highlighted.path);
  const resAtPath = path[0].res;
  const parents = getParentPaths(path, highlighted.name);
  const children = getChildPaths(resAtPath, highlighted);
  // console.log("getRelatedPaths", {
  //   // res,
  //   // highlighted: highlighted.path,
  //   walkedPath: path,
  //   // name: highlighted.name,
  //   parents,
  //   children,
  // });
  return { children, parents };
}

function getChildPaths(res: Res, binding: SituatedBinding): SituatedBinding[] {
  const trace = res.trace;
  switch (trace.type) {
    case "RefTrace":
      const mapping = Object.keys(trace.mappings).find(
        (key) => trace.mappings[key] === binding.name
      );
      if (!mapping) {
        return [];
      }
      return [
        binding,
        ...getChildPaths(trace.innerRes, {
          name: mapping,
          path: [
            ...binding.path,
            { name: trace.refTerm.relation, invokeLoc: trace.invokeLoc },
          ],
        }),
      ];
    case "AndTrace":
      return flatMap(trace.sources, (innerRes) =>
        getChildPaths(innerRes, binding)
      );
    case "MatchTrace":
      return [binding];
    default:
      return [];
  }
}

function getParentPaths(path: PathSeg[], binding: string): SituatedBinding[] {
  if (path.length === 0) {
    return [];
  }
  const first = path[0];
  const mapping = first.mappings[binding];
  // console.log("getParentPath", {
  //   path,
  //   binding,
  //   mappings: first.mappings,
  //   mapping,
  // });
  return mapping
    ? [
        { name: binding, path: first.path },
        ...getParentPaths(path.slice(1), mapping),
      ]
    : [{ name: binding, path: first.path }];
}
