import { RuleGraph, EdgeDestination, Res, NodeID, formatRes } from "./types";
import { Rec, Statement } from "../types";
import { substitute, unify, unifyVars } from "../unify";
import { addRule, declareTable } from "./build";
import { ppb, ppt } from "../pretty";

export function processStmt(
  graph: RuleGraph,
  stmt: Statement
): { newGraph: RuleGraph; emissionLog: Emission[] } {
  switch (stmt.type) {
    case "TableDecl": {
      const newGraph = declareTable(graph, stmt.name);
      return { newGraph, emissionLog: [] };
    }
    case "Rule": {
      const newGraph = addRule(graph, stmt.rule);
      return { newGraph, emissionLog: [] };
    }
    case "Insert":
      return insertFact(graph, stmt.record);
  }
}

export type Insertion = {
  res: Res;
  destination: EdgeDestination;
};

export type Emission = { fromID: NodeID; output: Res[] };

export function insertFact(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; emissionLog: Emission[] } {
  let toInsert: Insertion[] = [
    { res: { term: rec, bindings: {} }, destination: { nodeID: rec.relation } },
  ];
  let newGraph = graph;
  // batches of emissions
  const emissionLog: { fromID: NodeID; output: Res[] }[] = [];
  while (toInsert.length > 0) {
    const insertingNow = toInsert.shift();
    const curNodeID = insertingNow.destination.nodeID;
    const newEmissions = processInsertion(newGraph, insertingNow);
    // TODO: maybe limit to just external nodes?
    emissionLog.push({
      fromID: curNodeID,
      output: newEmissions,
    });
    for (let emission of newEmissions) {
      newGraph = addToCache(newGraph, curNodeID, emission);
      for (let destination of graph.edges[curNodeID] || []) {
        toInsert.push({
          destination,
          res: emission,
        });
      }
    }
  }
  return { newGraph, emissionLog };
}

// caller adds resulting facts
function processInsertion(graph: RuleGraph, ins: Insertion): Res[] {
  const node = graph.nodes[ins.destination.nodeID];
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return [ins.res];
    case "Join": {
      if (ins.destination.joinSide === undefined) {
        throw new Error("insertions to a join node must have a joinSide");
      }
      const results: Res[] = [];
      // TODO: DRY this up somehow?
      if (ins.destination.joinSide === "left") {
        const leftVars = ins.res.bindings;
        const rightRelation = graph.nodes[nodeDesc.rightID].cache;
        for (let possibleRightMatch of rightRelation) {
          const rightVars = possibleRightMatch.bindings;
          const unifyRes = unifyVars(leftVars, rightVars);
          // console.log("join from left", {
          //   left: formatRes(ins.res),
          //   right: formatRes(possibleRightMatch),
          //   unifyRes: ppb(unifyRes),
          // });
          if (unifyRes !== null) {
            results.push({
              term: ins.res.term,
              bindings: unifyRes,
            });
          }
        }
      } else {
        const rightVars = ins.res.bindings;
        const leftRelation = graph.nodes[nodeDesc.leftID].cache;
        for (let possibleLeftMatch of leftRelation) {
          const leftVars = possibleLeftMatch.bindings;
          const unifyRes = unifyVars(leftVars, rightVars);
          if (unifyRes !== null) {
            results.push({
              term: ins.res.term,
              bindings: unifyRes,
            });
          }
        }
      }
      return results;
    }
    case "Match": {
      const bindings = unify(ins.res.bindings, nodeDesc.rec, ins.res.term);
      // console.log("match", {
      //   insRec: ppt(ins.res.term),
      //   match: ppt(nodeDesc.rec),
      //   bindings: ppb(bindings),
      // });
      return [
        {
          term: ins.res.term,
          bindings,
        },
      ];
    }
    case "Substitute":
      const rec = substitute(nodeDesc.rec, ins.res.bindings);
      // console.log("substitute", {
      //   inBindings: ppb(ins.res.bindings),
      //   sub: ppt(nodeDesc.rec),
      //   out: ppt(rec),
      // });
      return [
        {
          term: rec,
          bindings: ins.res.bindings, // TODO: apply mapping?
        },
      ];
    case "BinExpr":
      throw new Error("TODO: incremental doesn't support BinExprs yet");
    case "BaseFactTable":
      return [ins.res];
  }
}

function addToCache(graph: RuleGraph, nodeID: NodeID, res: Res): RuleGraph {
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [nodeID]: {
        ...graph.nodes[nodeID],
        cache: [...graph.nodes[nodeID].cache, res],
      },
    },
  };
}

// TODO: retractStep
