import { RuleGraph, NodeID, EdgeDestination } from "./types";
import { Bindings, Rec, Term } from "../types";
import { unify } from "../unify";
import { flatten } from "../fp/flatten";
import { flatMap } from "../util";

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
  const node = graph.nodes[ins.dest.toID];
  const outEdges = graph.edges[ins.dest.toID] || [];
  switch (node.node.type) {
    case "Union":
      return outEdges.map((dest) => ({ rec: ins.rec, dest }));
    case "Join": {
      if (ins.dest.joinSide === undefined) {
        throw new Error("insertions to a join node must have a joinSide");
      }
      const otherRelationName =
        ins.dest.joinSide === "left"
          ? node.node.leftSide.relation
          : node.node.rightSide.relation;
      const insertions: Rec[] = [];
      const otherRelation = graph.nodes[otherRelationName].cache;
      const bindings: Bindings = {};
      for (let possibleMatch of otherRelation) {
        const unifyRes = unify(bindings, possibleMatch, ins.rec);
        if (unifyRes !== null) {
          // TODO: need to pass unifyRes up as well
          insertions.push(possibleMatch as Rec);
        }
      }
      return flatMap(outEdges, (dest) =>
        insertions.map((rec) => ({ rec, dest }))
      );
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
