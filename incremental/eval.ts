import { RuleGraph, NodeID } from "./types";
import { Rec, Term } from "../types";

export function insertFact(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; newFacts: Rec[] } {
  let toInsert = [rec];
  let newGraph = graph;
  let allNewFacts = [];
  while (toInsert.length > 0) {
    const insertingNow = toInsert.shift();
    let {
      newGraph: newGraphFromThisIteration,
      newFacts: newFactsFromThisIteration,
    } = stepAssert(graph, insertingNow);
    for (let newFact of newFactsFromThisIteration) {
      toInsert.push(newFact);
      allNewFacts.push(newFact);
      newGraph = newGraphFromThisIteration;
    }
  }
  return { newGraph, newFacts: allNewFacts };
}

type Insertion = { nodeID: NodeID; rec: Rec; joinSide?: "left" | "right" };

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
function processAssert(graph: RuleGraph, ins: Insertion): Insertion[] {
  const node = graph.nodes[ins.nodeID];
  const outEdges = graph.edges[ins.nodeID];
  switch (node.node.type) {
    case "Union":
      return outEdges.map((nodeID) => ({ rec: ins.rec, nodeID }));
    case "Join":
      // look at other side of join
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
