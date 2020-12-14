import { AttrPath, formatRes, JoinDesc, NodeAndCache, NodeDesc } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";
import { RuleGraph } from "./ruleGraph";
import { ppBE, ppt, ppVM } from "../pretty";

export function toGraphviz(
  graph: RuleGraph,
  highlightedNodeID?: string
): Graph {
  return {
    nodes: Object.entries(graph.nodes).map(([id, node]) => {
      return {
        id,
        attrs: {
          shape: "box",
          label:
            node.desc.type === "BaseFactTable"
              ? id
              : `${id}: ${formatDesc(node)}`,
          fillcolor: getNodeColor(node.desc) || "",
          style: "filled",
        },
        comment:
          node.cache.size() > 0
            ? `cache: [${node.cache
                .all()
                .map((res) => formatRes(res))
                .join(", ")}]`
            : "",
      };
    }),
    edges: flatMapObjToList(graph.edges, (fromID, destinations) =>
      destinations.map((dst) => ({
        from: fromID,
        to: dst,
        attrs: {},
      }))
    ),
    comments:
      Object.keys(graph.unmappedRules).length > 0
        ? mapObjToList(
            graph.unmappedRules,
            (name, rule) =>
              `unmapped: ${name} [${[...rule.newNodeIDs].join(", ")}]`
          )
        : [],
  };
}

function getNodeColor(nodeDesc: NodeDesc): string {
  switch (nodeDesc.type) {
    case "BaseFactTable":
      return "lightgrey";
    case "Join":
      return "lightblue";
    case "BinExpr":
      return "lavender";
    case "Substitute":
      return "darkseagreen1";
    case "Union":
      return "cornsilk";
  }
}

function formatDesc(node: NodeAndCache): string {
  const nodeDesc = node.desc;
  const mainRes = (() => {
    switch (nodeDesc.type) {
      case "BinExpr":
        return ppBE(nodeDesc.expr);
      case "Join":
        return `${nodeDesc.ruleName}: Join(${formatJoinDesc(nodeDesc)})`;
      case "Substitute":
        return `Subst({${mapObjToList(
          nodeDesc.rec.attrs,
          (key, val) => `${key}: ${ppt(val)}`
        ).join(", ")}})`;
      case "Union":
        return "Union";
    }
  })();
  return `${mainRes} [${node.cache.indexNames().join(", ")}]`;
}

function formatJoinDesc(joinDesc: JoinDesc): string {
  return mapObjToList(
    joinDesc.joinInfo,
    (key, { leftAttr, rightAttr }) =>
      `${key}: ${joinDesc.leftID}.${formatAttrPath(leftAttr)} = ${
        joinDesc.rightID
      }.${formatAttrPath(rightAttr)}`
  ).join(" & ");
}

function formatAttrPath(path: AttrPath): string {
  return path.join(".");
}
