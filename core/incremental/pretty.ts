import { NodeAndCache, NodeDesc } from "./types";
import { ppt } from "../pretty";
import { Set } from "immutable";
import { VarToPath } from "../types";

export function formatNodeDesc(nodeDesc: NodeDesc): string {
  switch (nodeDesc.type) {
    case "Join":
      return `Join(${nodeDesc.joinVars.toArray().sort().join(", ")})`;
    case "Match":
      return `Match(${ppt(nodeDesc.rec)})`;
    case "Substitute":
      return `Subst(${ppt(nodeDesc.rec)})`;
    case "Builtin":
      return `Builtin(${ppt(nodeDesc.rec)})`;
    case "Union":
      return "Union";
    case "BaseFactTable":
      return "";
    case "Negation":
      return `Negation()`;
    case "Aggregation":
      return `Agg(${
        nodeDesc.aggregation.aggregation
      }[${nodeDesc.aggregation.varNames.join(", ")}: ${ppt(
        nodeDesc.aggregation.record
      )}])`;
  }
}

export function formatNodeWithIndexes(node: NodeAndCache): string {
  return `${formatNodeDesc(node.desc)} [${node.cache.indexNames().join(", ")}]`;
}
