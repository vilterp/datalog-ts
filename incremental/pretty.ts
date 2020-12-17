import { AttrPath, JoinDesc, NodeAndCache, NodeDesc, Res } from "./types";
import { ppb, ppBE, ppt, ppVM } from "../pretty";
import { mapObjToList } from "../util/util";

export function formatNodeDesc(nodeDesc: NodeDesc): string {
  switch (nodeDesc.type) {
    case "BinExpr":
      return ppBE(nodeDesc.expr);
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

export function ppr(res: Res): string {
  return `${res.term ? ppt(res.term) : "()"}; ${ppb(res.bindings || {})}`;
}
