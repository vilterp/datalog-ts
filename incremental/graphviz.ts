import { RuleGraph, NodeDesc } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";
import { prettyPrintBinExpr, prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";

export function toGraphviz(graph: RuleGraph): Graph {
  return {
    nodes: mapObjToList(graph.nodes, (id, node) => {
      const ref = Object.keys(graph.relationRefs).find(
        (name) => graph.relationRefs[name] === id
      );
      return {
        id,
        attrs: {
          label:
            node.node.type === "BaseFactTable"
              ? ref
              : ref
              ? `${ref}: ${descToString(node.node)}`
              : descToString(node.node),
        },
      };
    }),
    edges: flatMapObjToList(graph.edges, (fromID, toIDs) =>
      toIDs.map((toID) => ({
        from: fromID,
        to: toID,
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
      return `Join(${node.leftAttr} == ${node.rightAttr})`;
    case "Match":
      return `Match(${pp.render(100, prettyPrintTerm(node.rec))})`;
    case "Union":
      return "Union";
  }
}
