import { EdgeOptions, NodeOptions, RecursivePartial } from "dagre-reactjs";
import { formatDesc, formatRes, NodeID, RuleGraph } from "./types";
import { flatMapObjToList, mapObjToList } from "../util";

export function toDagre(
  graph: RuleGraph,
  highlightedNodeID: NodeID
): {
  nodes: RecursivePartial<NodeOptions>[];
  edges: RecursivePartial<EdgeOptions>[];
} {
  return {
    nodes: mapObjToList(graph.nodes, (id, node) => {
      return {
        id,
        label: `${id}: ${formatDesc(node.desc)}`,
        shape: "rect",
        styles: {
          shape: {
            styles: {
              fill: id === highlightedNodeID ? "red" : "white",
              fillOpacity: 1,
            },
          },
        },
      };
    }),
    edges: flatMapObjToList(graph.edges, (fromID, destinations) =>
      destinations.map((dst) => ({
        from: fromID,
        to: dst,
      }))
    ),
  };
}
