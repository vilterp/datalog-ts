import { RuleGraph, NodeID, EdgeDestination } from "./types";
import { Bindings, Rec, Statement, Term } from "../types";
import { substitute, unify, unifyVars } from "../unify";
import { flatMap } from "../util";
import { addRule, declareTable } from "./build";

export function processStmt(
  graph: RuleGraph,
  stmt: Statement
): { newGraph: RuleGraph; propagationLog: Insertion[] } {
  switch (stmt.type) {
    case "TableDecl": {
      const newGraph = declareTable(graph, stmt.name);
      return { newGraph, propagationLog: [] };
    }
    case "Rule": {
      const newGraph = addRule(graph, stmt.rule);
      return { newGraph, propagationLog: [] };
    }
    case "Insert":
      return insertFact(graph, stmt.record);
  }
}

export function insertFact(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; propagationLog: Insertion[] } {
  let toInsert: Insertion[] = [
    { rec, destination: { nodeID: rec.relation }, bindings: {} },
  ];
  let newGraph = graph;
  let propagationLog = [];
  while (toInsert.length > 0) {
    const insertingNow = toInsert.shift();
    newGraph = addToCache(newGraph, insertingNow);
    const newInsertions = processInsertion(newGraph, insertingNow);
    for (let newInsertion of newInsertions) {
      toInsert.push(newInsertion);
      // TODO: maybe limit to just external nodes?
      propagationLog.push(newInsertion);
    }
  }
  return { newGraph, propagationLog };
}

export type Insertion = {
  rec: Rec;
  destination: EdgeDestination;
  bindings: Bindings;
};

// caller adds resulting facts
function processInsertion(graph: RuleGraph, ins: Insertion): Insertion[] {
  const node = graph.nodes[ins.destination.nodeID];
  const outEdges = graph.edges[ins.destination.nodeID] || [];
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return outEdges.map((destination) => ({
        rec: ins.rec,
        destination,
        bindings: ins.bindings,
      }));
    case "Join": {
      if (ins.destination.joinSide === undefined) {
        throw new Error("insertions to a join node must have a joinSide");
      }
      const insertions: { rec: Rec; bindings: Bindings }[] = [];
      // TODO: DRY this up somehow?
      if (ins.destination.joinSide === "left") {
        const leftVars = ins.bindings;
        const otherRelation = graph.nodes[nodeDesc.rightSide.relation].cache;
        for (let possibleMatch of otherRelation) {
          const rightVars = possibleMatch.bindings;
          const unifyRes = unifyVars(leftVars, rightVars);
          if (unifyRes !== null) {
            insertions.push({
              rec: possibleMatch.term as Rec,
              bindings: unifyRes,
            });
          }
        }
      } else {
        const rightVars = ins.bindings;
        const otherRelation = graph.nodes[nodeDesc.leftSide.relation].cache;
        for (let possibleMatch of otherRelation) {
          const leftVars = possibleMatch.bindings;
          const unifyRes = unifyVars(leftVars, rightVars);
          if (unifyRes !== null) {
            insertions.push({
              rec: possibleMatch.term as Rec,
              bindings: unifyRes,
            });
          }
        }
      }
      return flatMap(outEdges, (destination) =>
        insertions.map(({ rec, bindings }) => ({
          rec,
          destination,
          bindings,
        }))
      );
    }
    case "Match":
      const rec = substitute(nodeDesc.rec, ins.bindings) as Rec;
      return outEdges.map((dest) => ({
        rec,
        destination: dest,
        bindings: ins.bindings,
      }));
    case "BinExpr":
      // TODO: actually evaluate bin expr
      return outEdges.map((destination) => ({
        rec: ins.rec,
        destination,
        bindings: {},
      }));
    case "BaseFactTable":
      return outEdges.map((destination) => ({
        rec: ins.rec,
        destination,
        bindings: {},
      }));
  }
}

function addToCache(graph: RuleGraph, insertion: Insertion): RuleGraph {
  // TODO: bring in an immutable datastructures library
  const {
    destination: { nodeID },
    rec: term,
    bindings,
  } = insertion;
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [nodeID]: {
        ...graph.nodes[nodeID],
        cache: [...graph.nodes[nodeID].cache, { term, bindings }],
      },
    },
  };
}

// TODO: retractStep
