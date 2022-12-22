import { JoinInfo, NodeAndCache, NodeDesc } from "./types";
import { ppt, ppVM } from "../pretty";
import { mapObjToList } from "../../util/util";
import { Set } from "immutable";

export function formatNodeDesc(nodeDesc: NodeDesc): string {
  switch (nodeDesc.type) {
    case "Join":
      return `Join(${formatJoinInfo(nodeDesc.joinVars)})`;
    case "Match":
      return `Match(${JSON.stringify(nodeDesc.varToPath)})`;
    case "Substitute":
      return `Subst({${mapObjToList(
        nodeDesc.rec.attrs,
        (key, val) => `${key}: ${ppt(val)}`
      ).join(", ")}})`;
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

function formatJoinInfo(joinVars: Set<string>): string {
  // TODO: show paths?
  return joinVars.toArray().sort().join(", ");
}

export function formatNodeWithIndexes(node: NodeAndCache): string {
  return `${formatNodeDesc(node.desc)} [${node.cache.indexNames().join(", ")}]`;
}
