import { NodeAndCache, NodeDesc } from "./types";
import { ppt } from "../pretty";
import { Set } from "immutable";
import { VarToPath } from "../types";

export function formatNodeDesc(nodeDesc: NodeDesc): string {
  switch (nodeDesc.type) {
    case "Join":
      return `Join(${formatJoinInfo(nodeDesc.joinVars)})`;
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
      return `Negation(${formatJoinInfo(nodeDesc.joinDesc.joinVars)})`;
    case "Aggregation":
      return `Agg(${
        nodeDesc.aggregation.aggregation
      }[${nodeDesc.aggregation.varNames.join(", ")}: ${ppt(
        nodeDesc.aggregation.record
      )}])`;
  }
}

function formatVarToPath(varToPath: VarToPath): string {
  return `{${Object.keys(varToPath)
    .sort()
    .map((key) => `${key}: ${varToPath[key].join(".")}`)
    .join(", ")}}`;
}

function formatJoinInfo(joinVars: Set<string>): string {
  // TODO: show paths?
  return joinVars.toArray().sort().join(", ");
}

export function formatNodeWithIndexes(node: NodeAndCache): string {
  return `${formatNodeDesc(node.desc)} [${node.cache.indexNames().join(", ")}]`;
}
