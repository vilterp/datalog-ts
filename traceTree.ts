import { Tree, leaf, node, prettyPrintTree } from "./treePrinter";
import { Res } from "./types";
import { ppt, ppb } from "./pretty";

export function prettyPrintTrace(res: Res): string {
  return prettyPrintTree(traceToTree(res));
}

export function traceToTree(res: Res): Tree {
  const resStr = ppt(res.term);
  switch (res.trace.type) {
    case "AndTrace":
      return node(
        `And ${ppb(res.bindings)}`,
        res.trace.sources.map(traceToTree)
      );
    case "MatchTrace":
      return leaf(`Fact: ${resStr}; ${ppb(res.bindings)}`);
    case "RefTrace":
      return node(`Rule: ${resStr}; ${ppb(res.bindings)}`, [
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
