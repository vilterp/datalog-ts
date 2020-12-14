import { AttrPath, formatRes, JoinInfo, NodeAndCache } from "./types";
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
          color: id === highlightedNodeID ? "red" : "black",
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

function formatDesc(node: NodeAndCache): string {
  const nodeDesc = node.desc;
  const mainRes = (() => {
    switch (nodeDesc.type) {
      case "BinExpr":
        return ppBE(nodeDesc.expr);
      case "Join":
        return `${nodeDesc.ruleName}: Join(${formatJoinInfo(
          nodeDesc.joinInfo
        )})`;
      case "Match":
        return `Match(${ppt(nodeDesc.rec)}; ${ppVM(nodeDesc.mappings, [], {
          showScopePath: false,
        })})`;
      case "Substitute":
        return `Subst(${ppt(nodeDesc.rec)})`;
      case "Union":
        return "Union";
    }
  })();
  return `${mainRes} [${node.cache.indexNames().join(", ")}]`;
}

function formatJoinInfo(joinInfo: JoinInfo): string {
  return mapObjToList(
    joinInfo,
    (key, { leftAttr, rightAttr }) =>
      `${key}: ${formatAttrPath(leftAttr)}=${formatAttrPath(rightAttr)}`
  ).join(" & ");
}

function formatAttrPath(path: AttrPath): string {
  return path.join(".");
}
