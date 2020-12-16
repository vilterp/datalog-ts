import { NodeDesc } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";
import { RuleGraph } from "./ruleGraph";
import { formatNodeWithIndexes, ppr } from "./pretty";

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
          label: `${id}: ${formatNodeWithIndexes(node)}`,
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
