import { RuleGraph, NodeID, EdgeDestination } from "./types";
import { Bindings, Rec, Statement, Term } from "../types";
import { substitute, unify, unifyVars } from "../unify";
import { flatMap } from "../util";
import { addRule, declareTable } from "./build";
import { ppb, ppt } from "../pretty";

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
        const rightRelation = graph.nodes[nodeDesc.rightSide.relation].cache;
        for (let possibleRightMatch of rightRelation) {
          const rightVars = possibleRightMatch.bindings;
          const unifyRes = unifyVars(leftVars, rightVars);
          console.log({
            left: ppt(ins.rec),
            leftVars: ppb(leftVars),
            right: ppt(possibleRightMatch.term),
            rightVars: ppb(rightVars),
            unifyRes: ppb(unifyRes),
          });
          if (unifyRes !== null) {
            insertions.push({
              rec: possibleRightMatch.term as Rec,
              bindings: unifyRes,
            });
          }
        }
      } else {
        const rightVars = ins.bindings;
        const leftRelation = graph.nodes[nodeDesc.leftSide.relation].cache;
        for (let possibleLeftMatch of leftRelation) {
          const leftVars = possibleLeftMatch.bindings;
          const unifyRes = unifyVars(leftVars, rightVars);
          if (unifyRes !== null) {
            insertions.push({
              rec: possibleLeftMatch.term as Rec,
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
    case "Match": {
      // TODO: get rid of all these `as rec`s
      const bindings = unify(ins.bindings, nodeDesc.rec, ins.rec);
      // console.log({
      //   insRec: ppt(ins.rec),
      //   match: ppt(nodeDesc.rec),
      //   bindings: ppb(bindings),
      //   rec: ppt(rec),
      // });
      return outEdges.map((destination) => ({
        rec: ins.rec,
        destination,
        bindings,
      }));
    }
    case "Substitute":
      const rec = substitute(nodeDesc.rec, ins.bindings) as Rec;
      console.log({
        inBindings: ppb(ins.bindings),
        sub: ppt(nodeDesc.rec),
        out: ppt(rec),
      });
      return outEdges.map((destination) => ({
        rec,
        destination,
        bindings: ins.bindings, // apply mapping???
      }));
    case "BinExpr":
      throw new Error("TODO: incremental doesn't support BinExprs yet");
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
