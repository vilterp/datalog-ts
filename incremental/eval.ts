import { RuleGraph, NodeID, EdgeDestination } from "./types";
import { Bindings, Rec, Statement, Term } from "../types";
import { substitute, unify, unifyVars } from "../unify";
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
  let toInsert: Insertion[] = [
    { rec, dest: { toID: rec.relation }, bindings: {} },
  ];
  let newGraph = graph;
  let allNewFacts = [];
  while (toInsert.length > 0) {
    const insertingNow = toInsert.shift();
    newGraph = addToCache(newGraph, insertingNow.dest.toID, insertingNow.rec);
    const newInsertions = processInsertion(newGraph, insertingNow);
    for (let newInsertion of newInsertions) {
      toInsert.push(newInsertion);
      // TODO: maybe limit to just external nodes?
      allNewFacts.push(newInsertion.rec);
    }
  }
  return { newGraph, newFacts: allNewFacts };
}

type Insertion = { rec: Rec; dest: EdgeDestination; bindings: Bindings };

// caller adds resulting facts
function processInsertion(graph: RuleGraph, ins: Insertion): Insertion[] {
  const node = graph.nodes[ins.dest.toID];
  const outEdges = graph.edges[ins.dest.toID] || [];
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return outEdges.map((dest) => ({
        rec: ins.rec,
        dest,
        bindings: ins.bindings,
      }));
    case "Join": {
      if (ins.dest.joinSide === undefined) {
        throw new Error("insertions to a join node must have a joinSide");
      }
      // TODO: probably need to flip more parts of this around for left/right
      const otherRelationName =
        ins.dest.joinSide === "left"
          ? nodeDesc.leftSide.relation
          : nodeDesc.rightSide.relation;
      const bindings: Bindings = {};
      const leftVars = unify(bindings, nodeDesc.leftSide, ins.rec);
      const insertions: { rec: Rec; bindings: Bindings }[] = [];
      const otherRelation = graph.nodes[otherRelationName].cache;
      for (let possibleMatch of otherRelation) {
        const rightVars = unify(bindings, nodeDesc.rightSide, possibleMatch);
        const unifyRes = unifyVars(leftVars, rightVars);
        if (unifyRes !== null) {
          // TODO: need to pass unifyRes up as well
          insertions.push({ rec: possibleMatch as Rec, bindings: unifyRes });
        }
      }
      return flatMap(outEdges, (dest) =>
        insertions.map(({ rec, bindings }) => ({ rec, dest, bindings }))
      );
    }
    case "Match":
      // TODO: actually match
      // call unifyVars or something
      // substitute
      return outEdges.map((dest) => ({
        rec: substitute(nodeDesc.rec, ins.bindings) as Rec,
        dest,
        bindings: ins.bindings,
      }));
    case "BinExpr":
      // TODO: actually evaluate bin expr
      return outEdges.map((dest) => ({ rec: ins.rec, dest, bindings: {} }));
    case "BaseFactTable":
      return outEdges.map((dest) => ({ rec: ins.rec, dest, bindings: {} }));
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
