import { Tree, leaf, node, prettyPrintTree } from "./treePrinter";
import { Res, Rec, Bindings, Term, RecordWithBindings } from "./types";
import { ppt, ppb, prettyPrintRecWithBindings, ppr } from "./pretty";
import { termEq } from "./unify";
import { mapObj } from "./util";
import * as pp from "prettier-printer";

export function prettyPrintTrace(res: Res): string {
  return prettyPrintTree(traceToTree(res));
}

export function traceToTree(res: Res): Tree {
  const resStr = ppt(res.term);
  switch (res.trace.type) {
    case "AndTrace":
      return node(`And`, res.trace.sources.map(traceToTree));
    case "MatchTrace":
      return leaf(`Fact: ${printRecWithBindings(res)}`);
    case "RefTrace":
      return node(`Rule: ${printRecWithBindings(res)}`, [
        traceToTree(res.trace.innerRes),
      ]);
    case "VarTrace":
      return leaf(`var: ${resStr}`);
    case "BinExprTrace":
      return leaf(`bin_expr: ${resStr}`);
    case "BaseFactTrace":
      return leaf(`base_fact: ${resStr}`);
    case "LiteralTrace":
      return leaf(`literal: ${resStr}`);
  }
}

function printRecWithBindings(res: Res): string {
  return pp.render(100, prettyPrintRecWithBindings(recordWithBindings(res)));
}

// TODO: make this recurse into sub-records
function recordWithBindings(res: Res): RecordWithBindings {
  const rec = res.term as Rec;
  const out = {
    relation: rec.relation,
    attrs: mapObj(rec.attrs, (_, val) => {
      const binding = Object.keys(res.bindings).find((b) =>
        termEq(val, res.bindings[b])
      );
      return {
        term: val,
        binding: binding,
      };
    }),
  };
  return out;
}
