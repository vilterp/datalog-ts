import { RuleGraph, NodeDesc } from "./types";
import { Graph } from "../../util/graphviz";
import { flatMap, mapObjToList } from "../../util/util";
import { formatNodeWithIndexes } from "./pretty";

export function toGraphviz(
  graph: RuleGraph,
  highlightedNodeID?: string
): Graph {
  return {
    nodes: graph.nodes
      .map((node, id) => {
        return {
          id,
          attrs: {
            shape: "box",
            label: `${id}: ${formatNodeWithIndexes(node)}`,
            fillcolor: getNodeColor(node.desc) || "",
            style: "filled",
          },
        };
      })
      .valueSeq()
      .toArray(),
    edges: flatMap(graph.edges.toArray(), ([fromID, destinations]) =>
      destinations
        .map((dst) => ({
          from: fromID,
          to: dst,
          attrs: {},
        }))
        .toArray()
    ),
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
    case "Substitute":
      return "lightblue";
    case "Union":
      return "moccasin";
  }
}
