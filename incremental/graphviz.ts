import { AttrPath, ppr, JoinDesc, NodeAndCache, NodeDesc } from "./types";
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
          label: `${id}: ${formatDesc(node)}`,
          fillcolor: getNodeColor(node.desc) || "",
          style: "filled",
        },
        comment:
          node.cache.size() > 0
            ? `cache: [${node.cache
                .all()
                .map((res) => ppr(res))
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
      return "darksalmon";
    case "Match":
      return "darkseagreen2";
    case "Join":
      return "thistle";
    case "BinExpr":
      return "darkseagreen1";
    case "Substitute":
      return "lightblue";
    case "Union":
      return "moccasin";
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
