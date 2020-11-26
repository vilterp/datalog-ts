import { RuleGraph, NodeID, EdgeDestination } from "./types";
import { Rec, Term } from "../types";

export function insertFact(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; newFacts: Rec[] } {
  let toInsert: Insertion[] = [{ rec, dest: { toID: rec.relation } }];
  let newGraph = graph;
  let allNewFacts = [];
  while (toInsert.length > 0) {
    const insertingNow = toInsert.shift();
    const newInsertions = processInsertion(graph, insertingNow);
    for (let newInsertion of newInsertions) {
      toInsert.push(newInsertion);
      // TODO: maybe limit to just external nodes?
      allNewFacts.push(newInsertion.rec);
      newGraph = addToCache(newGraph, newInsertion.dest.toID, newInsertion.rec);
    }
  }
  return { newGraph, newFacts: allNewFacts };
}

type Insertion = { rec: Rec; dest: EdgeDestination };

// caller adds resulting facts
function processInsertion(graph: RuleGraph, ins: Insertion): Insertion[] {
  console.log({ ins });
  const node = graph.nodes[ins.dest.toID];
  const outEdges = graph.edges[ins.dest.toID] || [];
  switch (node.node.type) {
    case "Union":
      return outEdges.map((dest) => ({ rec: ins.rec, dest }));
    case "Join": {
      const newRec: Rec = {
        type: "Record",
        relation: ins.dest.toID,
        attrs: {},
      };
      // look at other side of join
      return outEdges.map((dest) => ({ rec: newRec, dest }));
    }
    case "Match":
      // TODO: actually match
      // call unifyVars or something
      return outEdges.map((dest) => ({ rec: ins.rec, dest }));
    case "BinExpr":
      // TODO: actually evaluate bin expr
      return outEdges.map((dest) => ({ rec: ins.rec, dest }));
    case "BaseFactTable":
      return outEdges.map((dest) => ({ rec: ins.rec, dest }));
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
