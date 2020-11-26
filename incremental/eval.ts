import { RuleGraph, NodeID, EdgeDestination } from "./types";
import { Bindings, Rec, Statement, Term } from "../types";
import { unify, unifyVars } from "../unify";
import { flatMap } from "../util";
import { addRule, declareTable } from "./build";

export function processStmt(
  graph: RuleGraph,
  stmt: Statement
): { newGraph: RuleGraph; newFacts: Rec[] } {
  switch (stmt.type) {
    case "TableDecl": {
      const newGraph = declareTable(graph, stmt.name);
      return { newGraph, newFacts: [] };
    }
    case "Rule": {
      const newGraph = addRule(graph, stmt.rule);
      return { newGraph, newFacts: [] };
    }
    case "Insert":
      return insertFact(graph, stmt.record);
  }
}

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
    newGraph = addToCache(newGraph, insertingNow.dest.toID, insertingNow.rec);
    for (let newInsertion of newInsertions) {
      toInsert.push(newInsertion);
      // TODO: maybe limit to just external nodes?
      allNewFacts.push(newInsertion.rec);
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
      // TODO: probably need to flip more parts of this around for left/right
      const otherRelationName =
        ins.dest.joinSide === "left"
          ? node.node.leftSide.relation
          : node.node.rightSide.relation;
      const bindings: Bindings = {};
      const leftVars = unify(bindings, node.node.leftSide, ins.rec);
      const insertions: Rec[] = [];
      const otherRelation = graph.nodes[otherRelationName].cache;
      for (let possibleMatch of otherRelation) {
        const rightVars = unify(bindings, node.node.rightSide, possibleMatch);
        const unifyRes = unifyVars(leftVars, rightVars);
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
