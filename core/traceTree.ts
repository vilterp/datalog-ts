import { Tree, leaf, node } from "../util/tree";
import {
  Res,
  SituatedBinding,
  ScopePath,
  VarMappings,
  Term,
  Bindings,
  TermWithBindings,
} from "./types";
import {
  ppt,
  prettyPrintTermWithBindings,
  ppVM,
  TracePrintOpts,
  defaultTracePrintOpts,
} from "./pretty";
import { flatMap, getFirst, filterMap, mapObj } from "../util/util";
import * as pp from "prettier-printer";
import { jsonEq } from "../util/json";

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
      // TODO: unbreak variable bindings in simple interpreter
      //   it worked when this line was
      //     return leaf(printTermWithBindings(res, [], defaultTracePrintOpts), res);
      //   ...not sure why. Changed to make traces work in incremental interpreter.
      return traceToTree(res.trace.fact);
    case "RefTrace": {
      const innerRes = res.trace.innerRes;
      return node(
        `${printTermWithBindings(res, [], defaultTracePrintOpts)}; ${ppVM(
          res.trace.mappings,
          [],
          defaultTracePrintOpts
        )}`,
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
    case "BaseFactTrace":
      return leaf(`base_fact: ${resStr}`, res);
    case "LiteralTrace":
      return leaf(`literal: ${resStr}`, res);
    case "NegationTrace":
      return leaf("negation", res);
    case "AggregationTrace":
      return leaf("aggregation", res);
  }
}

// TODO: make a function that does this to the whole tree
// so we don't have to thread it through both traceToTree and traceToGraph
function collapseAndSources(sources: Res[]): Res[] {
  if (sources.length === 2 && sources[1].trace.type === "AndTrace") {
    return [sources[0], ...collapseAndSources(sources[1].trace.sources)];
  }
  return sources;
}

export function printTermWithBindings(
  res: Res,
  scopePath: ScopePath,
  opts: TracePrintOpts
): string {
  return pp.render(
    100,
    prettyPrintTermWithBindings(
      makeTermWithBindings(res.term, res.bindings),
      scopePath,
      opts
    )
  );
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

export function pathToScopePath(path: Res[]): ScopePath {
  return filterMap(path, (res) =>
    res.trace.type === "RefTrace"
      ? { name: res.trace.refTerm.relation, invokeLoc: res.trace.invokeLoc }
      : null
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
            return bindings[b] && jsonEq(val, bindings[b]);
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
    case "Negation":
      return {
        type: "NegationWithBindings",
        inner: makeTermWithBindings(term.record, bindings),
      };
    case "Aggregation":
      return {
        type: "AggregationWithBindings",
        aggregation: term.aggregation,
        varNames: term.varNames,
        record: makeTermWithBindings(term.record, bindings),
      };
    default:
      return { type: "Atom", term };
  }
}
