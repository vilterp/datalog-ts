import { Tree, leaf, node, prettyPrintTree } from "./treePrinter";
import { Res, Trace } from "./types";
import { ppr, ppt } from "./pretty";

export function prettyPrintTrace(trace: Trace): string {
  return prettyPrintTree(traceToTree(trace));
}

export function traceToTree(trace: Trace): Tree {
  switch (trace.type) {
    case "AndTrace":
      return node(`And (${trace.ruleName})`, trace.sources.map(resToTraceTree));
    case "MatchTrace":
      return node(`Match (${ppt(trace.match)})`, [resToTraceTree(trace.fact)]);
    case "VarTrace":
      return leaf("var");
    case "BinExprTrace":
      return leaf("bin expr");
    case "BaseFactTrace":
      return leaf("base fact");
    case "LiteralTrace":
      return leaf("literal");
  }
}

function resToTraceTree(res: Res): Tree {
  return { body: ppr(res), children: [traceToTree(res.trace)] };
}
