import { RuleGraph, NodeDesc, formatDesc } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";
import { ppt, ppVM, prettyPrintBinExpr, prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";

export function toGraphviz(graph: RuleGraph): Graph {
  return {
    nodes: mapObjToList(graph.nodes, (id, node) => {
      return {
        id,
        attrs: {
          shape: "box",
          label:
            node.desc.type === "BaseFactTable"
              ? id
              : `${id}: ${formatDesc(node.desc)}`,
        },
      };
    }),
    edges: flatMapObjToList(graph.edges, (fromID, destinations) =>
      destinations.map((dst) => ({
        from: fromID,
        to: dst,
        attrs: {},
      }))
    ),
  };
}
