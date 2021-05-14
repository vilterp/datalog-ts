import { RuleGraph, formatDesc, formatRes } from "./types";
import { Graph } from "../../util/graphviz";
import { mapObjToList } from "../../util/util";

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
            label: `${id}: ${formatDesc(node)}`,
            color: id === highlightedNodeID ? "red" : "black",
          },
          comment:
            node.cache.size > 0
              ? `cache: [${node.cache
                  .all()
                  .map((res) => formatRes(res))
                  .join(", ")}]`
              : "",
        };
      })
      .valueSeq()
      .toArray(),
    edges: graph.edges
      .entrySeq()
      .flatMap(([fromID, destinations]) =>
        destinations.map((dst) => ({
          from: fromID,
          to: dst,
          attrs: {},
        }))
      )
      .toArray(),
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
