import { formatDesc, formatRes } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";
import { RuleGraph } from "./ruleGraph";

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
