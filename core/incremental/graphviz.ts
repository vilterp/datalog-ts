import { RuleGraph, NodeDesc } from "./types";
import { Graph } from "../../util/graphviz";
import { flatMapObjToList, mapObjToList } from "../../util/util";
import { ppr } from "../pretty";
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
          comment:
            node.cache.size > 0
              ? `cache: [${node.cache
                  .all()
                  .map((res) => ppr(res))
                  .join(", ")}]`
              : "",
        };
      })
      .valueSeq()
      .toArray(),
    edges: graph.edges
      .flatMap((destinations, fromID) =>
        destinations.map((dst) => [
          fromID,
          {
            from: fromID,
            to: dst,
            attrs: {},
          },
        ])
      )
      .valueSeq()
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
