import { RuleGraph, Res, NodeID, formatRes } from "./types";
import { Rec } from "../types";
import { applyMappings, substitute, unify, unifyVars } from "../unify";
import { ppb, ppt } from "../pretty";
export type Insertion = {
  res: Res;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type EmissionBatch = { fromID: NodeID; output: Res[] };

export function insertFact(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; emissionLog: EmissionBatch[] } {
  let iter = getInsertionIterator(graph, rec);
  const emissionLog: EmissionBatch[] = [];
  let newGraph = graph;
  while (true) {
    const [emissions, nextIter] = stepIterator(iter);
    emissionLog.push(emissions);
    if (nextIter.queue.length === 0) {
      break;
    }
    newGraph = nextIter.graph;
    iter = nextIter;
  }
  return { newGraph, emissionLog };
}

export function getInsertionIterator(
  graph: RuleGraph,
  rec: Rec
): InsertionIterator {
  const queue: Insertion[] = [
    {
      res: { term: rec, bindings: {} },
      origin: null,
      destination: rec.relation,
    },
  ];
  return { graph, queue };
}

type InsertionIterator = {
  graph: RuleGraph;
  queue: Insertion[];
};

function stepIterator(
  iter: InsertionIterator
): [EmissionBatch, InsertionIterator] {
  const newQueue = iter.queue.slice(1);
  let newGraph = iter.graph;
  const insertingNow = iter.queue[0];
  const curNodeID = insertingNow.destination;
  const results = processInsertion(iter.graph, insertingNow);
  for (let result of results) {
    newGraph = addToCache(newGraph, curNodeID, result);
    for (let destination of newGraph.edges[curNodeID] || []) {
      newQueue.push({
        destination,
        origin: curNodeID,
        res: result,
      });
    }
  }
  const newIter = { graph: newGraph, queue: newQueue };
  return [{ fromID: curNodeID, output: results }, newIter];
}

// caller adds resulting facts
function processInsertion(graph: RuleGraph, ins: Insertion): Res[] {
  const node = graph.nodes[ins.destination];
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return [ins.res];
    case "Join": {
      const results: Res[] = [];
      // TODO: DRY this up somehow?
      if (ins.origin === nodeDesc.leftID) {
        const leftVars = ins.res.bindings;
        const rightRelation = graph.nodes[nodeDesc.rightID].cache;
        for (let possibleRightMatch of rightRelation) {
          const rightVars = possibleRightMatch.bindings;
          const unifyRes = unifyVars(leftVars || {}, rightVars || {});
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
          const unifyRes = unifyVars(leftVars || {}, rightVars || {});
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
      console.log("match", {
        insRec: formatRes(ins.res),
        match: ppt(nodeDesc.rec),
        bindings: ppb(bindings || {}),
      });
      return [
        {
          term: ins.res.term,
          bindings: applyMappings(nodeDesc.mappings, bindings),
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
