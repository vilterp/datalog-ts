import { NodeAndCache, NodeDesc } from "./types";
import { ppt, ppVM } from "../pretty";
import { mapObjToList } from "../../util/util";

export function formatNodeDesc(nodeDesc: NodeDesc): string {
  switch (nodeDesc.type) {
    case "Join":
      return `Join(${nodeDesc.joinVars.join(", ")})`;
    case "Match":
      return `Match(${ppt(nodeDesc.rec)}; ${ppVM(nodeDesc.mappings, [], {
        showScopePath: false,
      })})`;
    case "Substitute":
      return `Subst({${mapObjToList(
        nodeDesc.rec.attrs,
        (key, val) => `${key}: ${ppt(val)}`
      ).join(", ")}})`;
    case "Union":
      return "Union";
    case "BaseFactTable":
      return "";
  }
}

export function formatNodeWithIndexes(node: NodeAndCache): string {
  return `${formatNodeDesc(node.desc)} [${node.cache.indexNames().join(", ")}]`;
}
