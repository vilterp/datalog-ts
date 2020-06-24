import { RuleGraph, NodeID } from "./types";
import { Rec, Term } from "../types";

function stepAssert(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; newFacts: Rec[] } {
  const tableID = rec.relation;
  const g1 = addToCache(graph, tableID, rec);
  const nextNodes = graph.edges[tableID];
  return XXX;
}

// caller adds resulting facts
function processAssert(graph: RuleGraph, nodeID: NodeID, rec: Rec): Rec[] {
  const node = graph.nodes[nodeID];
  switch (node.node.type) {
    case "Union":
      return [rec];
    case "Join":
      return XXX;
    case "Match":
      // TODO: actually match
      // call unifyVars or something
      return [rec];
    case "BinExpr":
      // TODO: actually evaluate bin expr
      return [rec];
    case "BaseFactTable":
      return [rec];
  }
}

function addToCache(graph: RuleGraph, nodeID: NodeID, term: Term): RuleGraph {
  // TODO: bring in an immutable datastructures library
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [nodeID]: {
        ...graph.nodes[nodeID],
        cache: [...graph.nodes[nodeID].cache, term],
      },
    },
  };
}

// TODO: retractStep
