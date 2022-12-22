import { JoinInfo, NodeAndCache, NodeDesc } from "./types";
import { ppt, ppVM } from "../pretty";
import { mapObjToList } from "../../util/util";

export function formatNodeDesc(nodeDesc: NodeDesc): string {
  switch (nodeDesc.type) {
    case "Join":
      return `Join(${formatJoinInfo(nodeDesc.joinInfo)})`;
    case "Match":
      return `Match(${ppt(nodeDesc.rec)}; ${ppVM(nodeDesc.mappings, [], {
        showScopePath: false,
      })})`;
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
      return `Negation(${formatJoinInfo(nodeDesc.joinDesc.joinInfo)})`;
    case "Aggregation":
      return `Agg(${nodeDesc.aggregation.varNames.join(", ")}: ${ppt(
        nodeDesc.aggregation.record
      )})`;
  }
}

function formatJoinInfo(joinInfo: JoinInfo): string {
  // TODO: show paths?
  return Object.keys(joinInfo).sort().join(", ");
}

export function formatNodeWithIndexes(node: NodeAndCache): string {
  return `${formatNodeDesc(node.desc)} [${node.cache.indexNames().join(", ")}]`;
}
