import { AttrPath, JoinDesc, NodeAndCache, Res } from "./types";
import { ppb, ppBE, ppt, ppVM } from "../pretty";
import { mapObjToList } from "../util";

export function formatNode(node: NodeAndCache): string {
  const nodeDesc = node.desc;
  const mainRes = (() => {
    switch (nodeDesc.type) {
      case "BinExpr":
        return ppBE(nodeDesc.expr);
      case "Join":
        return `Join(${nodeDesc.ruleName}, ${formatJoinDesc(nodeDesc)})`;
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
  })();
  return `${mainRes} [${node.cache.indexNames().join(", ")}]`;
}

function formatJoinDesc(joinDesc: JoinDesc): string {
  return mapObjToList(
    joinDesc.joinInfo.join,
    (key, { leftAttr, rightAttr }) =>
      `${key}: ${joinDesc.leftID}.${formatAttrPath(leftAttr)} = ${
        joinDesc.rightID
      }.${formatAttrPath(rightAttr)}`
  ).join(" & ");
}

function formatAttrPath(path: AttrPath): string {
  return path.join(".");
}

export function ppr(res: Res): string {
  return `${ppt(res.term)}; ${ppb(res.bindings || {})}`;
}
