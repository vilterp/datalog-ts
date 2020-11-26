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
    { rec, dest: { toID: rec.relation }, bindings: {} },
  ];
  let newGraph = graph;
  let propagationLog = [];
  while (toInsert.length > 0) {
    const insertingNow = toInsert.shift();
    newGraph = addToCache(newGraph, insertingNow.dest.toID, insertingNow.rec);
    const newInsertions = processInsertion(newGraph, insertingNow);
    for (let newInsertion of newInsertions) {
      toInsert.push(newInsertion);
      // TODO: maybe limit to just external nodes?
      propagationLog.push(newInsertion);
    }
  }
  return { newGraph, propagationLog };
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
      const insertions: { rec: Rec; bindings: Bindings }[] = [];
      const bindings: Bindings = ins.bindings;
      // TODO: DRY this up somehow?
      if (ins.dest.joinSide === "left") {
        const leftVars = unify(bindings, nodeDesc.leftSide, ins.rec);
        const otherRelation = graph.nodes[nodeDesc.rightSide.relation].cache;
        for (let possibleMatch of otherRelation) {
          const rightVars = unify(bindings, nodeDesc.rightSide, possibleMatch);
          const unifyRes = unifyVars(leftVars, rightVars);
          if (unifyRes !== null) {
            insertions.push({ rec: possibleMatch as Rec, bindings: unifyRes });
          }
        }
      } else {
        const rightVars = unify(bindings, ins.rec, nodeDesc.rightSide);
        const otherRelation = graph.nodes[nodeDesc.leftSide.relation].cache;
        for (let possibleMatch of otherRelation) {
          const leftVars = unify(bindings, possibleMatch, nodeDesc.leftSide);
          const unifyRes = unifyVars(leftVars, rightVars);
          if (unifyRes !== null) {
            insertions.push({ rec: possibleMatch as Rec, bindings: unifyRes });
          }
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
