import { RuleGraph, NodeDesc } from "./types";
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
              : `${id}: ${descToString(node.desc)}`,
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

function descToString(node: NodeDesc): string {
  switch (node.type) {
    case "BaseFactTable":
      return node.name;
    case "BinExpr":
      return pp.render(100, prettyPrintBinExpr(node.expr));
    case "Join":
      return `Join(${node.leftID} & ${node.rightID})`;
    case "Match":
      return `Match(${ppt(node.rec)}; ${ppVM(node.mappings, [], {
        showScopePath: false,
      })})`;
    case "Substitute":
      return `Subst(${ppt(node.rec)})`;
    case "Union":
      return "Union";
  }
}
