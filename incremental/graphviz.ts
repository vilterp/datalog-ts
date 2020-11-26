import { RuleGraph, NodeDesc } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";
import { ppt, prettyPrintBinExpr, prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";

export function toGraphviz(graph: RuleGraph): Graph {
  return {
    nodes: mapObjToList(graph.nodes, (id, node) => {
      return {
        id,
        attrs: {
          label:
            node.desc.type === "BaseFactTable"
              ? id
              : `${id}: ${descToString(node.desc)}`,
        },
      };
    }),
    edges: flatMapObjToList(graph.edges, (fromID, destinations) =>
      destinations.map((dst) => ({
        from: fromID,
        to: dst.nodeID,
        attrs: {
          label: dst.joinSide || "",
        },
      }))
    ),
  };
}

function descToString(node: NodeDesc): string {
  switch (node.type) {
    case "BaseFactTable":
      return node.name;
    case "BinExpr":
      return pp.render(100, prettyPrintBinExpr(node.expr));
    case "Join":
      return `Join(${ppt(node.leftSide)} & ${ppt(node.rightSide)})`;
    case "Match":
      return `Match(${pp.render(100, prettyPrintTerm(node.rec))})`;
    case "Union":
      return "Union";
  }
}
