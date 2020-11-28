import { RuleGraph, Res, NodeID, formatRes, formatDesc } from "./types";
import { Rec, Rule } from "../types";
import { applyMappings, substitute, unify, unifyVars } from "../unify";
import { ppb, ppRule, ppt, ppVM } from "../pretty";
import { evalBinExpr } from "../binExpr";
import { filterMap, flatMap, mapObjToList, reduceObj } from "../util";
import {
  addEdge,
  addNodeKnownID,
  addOr,
  addUnmappedRule,
  resolveUnmappedRule,
} from "./build";

export type Insertion = {
  res: Res;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type EmissionBatch = { fromID: NodeID; output: Res[] };

export function addRule(
  graph: RuleGraph,
  rule: Rule
): { newGraph: RuleGraph; emissionLog: EmissionBatch[] } {
  // console.log("add", rule.head.relation);
  // TODO: compute cache for this rule when we add it
  const matchID = rule.head.relation;
  const { newGraph: withOr, tipID: orID, newNodeIDs } = addOr(graph, rule.defn);
  const withSubst = addNodeKnownID(matchID, withOr, false, {
    type: "Substitute",
    rec: rule.head,
  });
  const withEdge = addEdge(withSubst, orID, matchID);
  const withUnmapped = addUnmappedRule(withEdge, rule, newNodeIDs);
  let resultGraph = withUnmapped;
  for (let unmappedRuleName in withUnmapped.unmappedRules) {
    const rule = withUnmapped.unmappedRules[unmappedRuleName];
    resultGraph = resolveUnmappedRule(resultGraph, rule.rule, rule.newNodeIDs);
  }
  if (Object.keys(resultGraph.unmappedRules).length === 0) {
    const nodesToReplay = new Set([
      ...flatMap(
        Object.values(withUnmapped.unmappedRules).map(({ rule }) => rule),
        getRoots
      ),
    ]);
    return replayFacts(resultGraph, nodesToReplay);
  }
  return { newGraph: resultGraph, emissionLog: [] };
}

function replayFacts(
  graph: RuleGraph,
  roots: Set<NodeID>
): { newGraph: RuleGraph; emissionLog: EmissionBatch[] } {
  console.log("replayFacts", roots);
  let outGraph = graph;
  let outLog: EmissionBatch[] = [];
  const toInsert: Rec[] = [];
  for (let rootID of roots) {
    for (let res of graph.nodes[rootID].cache) {
      toInsert.push(res.term as Rec);
    }
  }
  for (let rec of toInsert) {
    const { newGraph, emissionLog } = insertFact(outGraph, rec);
    outGraph = newGraph;
    for (let emission of emissionLog) {
      outLog.push(emission);
    }
  }
  return { newGraph: outGraph, emissionLog: outLog };
}

function getRoots(rule: Rule): NodeID[] {
  return flatMap(rule.defn.opts, (opt) => {
    return filterMap(opt.clauses, (andClause) => {
      if (andClause.type === "BinExpr") {
        return null;
      }
      return andClause.relation;
    });
  });
}

export function insertFact(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; emissionLog: EmissionBatch[] } {
  if (Object.keys(graph.unmappedRules).length > 0) {
    throw new Error(
      `some rules still rely on things not defined yet: [${mapObjToList(
        graph.unmappedRules,
        (name) => name
      ).join(", ")}]`
    );
  }

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
      const mappedBindings = applyMappings(nodeDesc.mappings, ins.res.bindings);
      const bindings = unify(mappedBindings, nodeDesc.rec, ins.res.term);
      // console.log("match", {
      //   insRec: formatRes(ins.res),
      //   match: ppt(nodeDesc.rec),
      //   bindings: ppb(bindings || {}),
      //   mappings: ppVM(nodeDesc.mappings, [], { showScopePath: false }),
      //   mappedBindings: ppb(mappedBindings),
      // });
      return [
        {
          term: ins.res.term,
          bindings: bindings,
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
          bindings: ins.res.bindings,
        },
      ];
    case "BinExpr":
      const result = evalBinExpr(nodeDesc.expr, ins.res.bindings);
      return result ? [ins.res] : [];
    case "BaseFactTable":
      return [ins.res];
  }
}

export function doQuery(graph: RuleGraph, query: Rec): Res[] {
  const node = graph.nodes[query.relation];
  if (!node) {
    // TODO: maybe start using result type
    throw new Error(`no such relation: ${query.relation}`);
  }
  return filterMap(node.cache, (res) => {
    const bindings = unify({}, res.term, query);
    if (bindings === null) {
      return null;
    }
    return { term: res.term, bindings };
  });
}

// helpers

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
