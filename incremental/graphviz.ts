import { RuleGraph, formatDesc, formatRes } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";

export function toGraphviz(
  graph: RuleGraph,
  highlightedNodeID?: string
): Graph {
  return {
    nodes: mapObjToList(graph.nodes, (id, node) => {
      return {
        id,
        attrs: {
          shape: "box",
          label: `${id}: ${formatDesc(node.desc)}`,
          color: id === highlightedNodeID ? "red" : "black",
        },
        comment:
          node.cache.length > 0
            ? `cache: [${node.cache.map((res) => formatRes(res)).join(", ")}]`
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
