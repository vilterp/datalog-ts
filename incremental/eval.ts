import {
  RuleGraph,
  Res,
  NodeID,
  formatRes,
  formatDesc,
  NodeDesc,
  JoinDesc,
} from "./types";
import { Rec, Rule } from "../types";
import { applyMappings, substitute, unify, unifyVars } from "../unify";
import { ppb, ppr, ppRule, ppt, ppVM } from "../pretty";
import { evalBinExpr } from "../binExpr";
import { filterMap, flatMap, mapObjToList, reduceObj } from "../util";
import {
  addEdge,
  addNodeKnownID,
  addOr,
  addUnmappedRule,
  resolveUnmappedRule,
} from "./build";
import { Performance } from "w3c-hr-time";

const performance = new Performance();

export type Insertion = {
  res: Res;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type EmissionLog = EmissionBatch[];

export type EmissionBatch = { fromID: NodeID; output: Res[] };

export function addRule(
  graph: RuleGraph,
  rule: Rule
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  // console.log("add", rule.head.relation);
  const substID = rule.head.relation;
  const { newGraph: withOr, tipID: orID, newNodeIDs } = addOr(
    graph,
    rule.head.relation,
    rule.defn
  );
  const withSubst = addNodeKnownID(substID, withOr, false, {
    type: "Substitute",
    rec: rule.head,
  });
  newNodeIDs.add(substID); // TODO: weird mix of mutation and non-mutation here...?
  const withEdge = addEdge(withSubst, orID, substID);
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
    return replayFacts(resultGraph, newNodeIDs, nodesToReplay);
  }
  return { newGraph: resultGraph, emissionLog: [] };
}

function replayFacts(
  graph: RuleGraph,
  allNewNodes: Set<NodeID>,
  roots: Set<NodeID>
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  // console.log("replayFacts", roots);
  let outGraph = graph;
  let outEmissionLog: EmissionLog = [];
  for (let rootID of roots) {
    for (let res of graph.nodes.get(rootID).cache) {
      for (let destination of graph.edges.get(rootID)) {
        const iter = getReplayIterator(outGraph, allNewNodes, [
          {
            res,
            origin: rootID,
            destination,
          },
        ]);
        const { newGraph, emissionLog } = stepIteratorAll(outGraph, iter);
        outGraph = newGraph;
        for (let emission of emissionLog) {
          outEmissionLog.push(emission);
        }
      }
    }
  }
  return { newGraph: outGraph, emissionLog: outEmissionLog };
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
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  if (Object.keys(graph.unmappedRules).length > 0) {
    throw new Error(
      `some rules still rely on things not defined yet: [${mapObjToList(
        graph.unmappedRules,
        (name) => name
      ).join(", ")}]`
    );
  }

  const iter = getInsertionIterator(graph, rec);
  const res = stepIteratorAll(graph, iter);

  return res;
}

function getInsertionIterator(graph: RuleGraph, rec: Rec): InsertionIterator {
  const queue: Insertion[] = [
    {
      res: { term: rec, bindings: {} },
      origin: null,
      destination: rec.relation,
    },
  ];
  return { graph, queue, mode: { type: "Playing" } };
}

function getReplayIterator(
  graph: RuleGraph,
  newNodeIDs: Set<NodeID>,
  queue: Insertion[]
): InsertionIterator {
  return {
    graph,
    queue,
    mode: { type: "Replaying", newNodeIDs },
  };
}

type InsertionIterator = {
  graph: RuleGraph;
  queue: Insertion[];
  mode: { type: "Replaying"; newNodeIDs: Set<NodeID> } | { type: "Playing" };
};

function stepIteratorAll(
  graph: RuleGraph,
  iter: InsertionIterator
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const emissionLog: EmissionLog = [];
  while (iter.queue.length > 0) {
    const emissions = stepIterator(iter);
    emissionLog.push(emissions);
  }
  return { newGraph: iter.graph, emissionLog };
}

function stepIterator(iter: InsertionIterator): EmissionBatch {
  // console.log("stepIterator", iter.queue);
  let newGraph = iter.graph;
  const insertingNow = iter.queue.shift();
  const curNodeID = insertingNow.destination;
  const results = processInsertion(iter.graph, insertingNow);
  for (let result of results) {
    if (iter.mode.type === "Playing" || iter.mode.newNodeIDs.has(curNodeID)) {
      newGraph = addToCache(newGraph, curNodeID, result);
    }
    for (let destination of newGraph.edges.get(curNodeID) || []) {
      iter.queue.push({
        destination,
        origin: curNodeID,
        res: result,
      });
    }
  }
  iter.graph = newGraph;
  return { fromID: curNodeID, output: results };
}

// caller adds resulting facts
function processInsertion(graph: RuleGraph, ins: Insertion): Res[] {
  const node = graph.nodes.get(ins.destination);
  if (!node) {
    throw new Error(`not found: node ${ins.destination}`);
  }
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return [ins.res];
    case "Join": {
      if (ins.origin === nodeDesc.leftID) {
        return doJoin(graph, ins, nodeDesc.ruleName, nodeDesc.rightID);
      } else {
        return doJoin(graph, ins, nodeDesc.ruleName, nodeDesc.leftID);
      }
    }
    case "Match": {
      const mappedBindings = applyMappings(nodeDesc.mappings, ins.res.bindings);
      const bindings = unify(mappedBindings, nodeDesc.rec, ins.res.term);
      if (bindings === null) {
        return [];
      }
      for (let key of Object.keys(bindings)) {
        // console.log({ bindings, key });
        if (bindings[key].type === "Var") {
          return [];
        }
      }
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

type JoinStats = {
  joinTimeMS: number;
  recordsJoined: number;
};

let joinStats: JoinStats = {
  joinTimeMS: 0,
  recordsJoined: 0,
};

export function getJoinStats(): JoinStats {
  return joinStats;
}

export function clearJoinStats() {
  joinStats = { joinTimeMS: 0, recordsJoined: 0 };
}

function doJoin(
  graph: RuleGraph,
  ins: Insertion,
  ruleName: string,
  otherNode: NodeID
): Res[] {
  const results: Res[] = [];
  const thisVars = ins.res.bindings;
  const otherRelation = graph.nodes.get(otherNode).cache;
  const before = performance.now();
  for (let possibleOtherMatch of otherRelation) {
    const otherVars = possibleOtherMatch.bindings;
    const unifyRes = unifyVars(thisVars || {}, otherVars || {});
    // console.log("join", {
    //   left: formatRes(ins.res),
    //   right: formatRes(possibleOtherMatch),
    //   unifyRes: ppb(unifyRes),
    // });
    if (unifyRes !== null) {
      results.push({
        term: { ...(ins.res.term as Rec), relation: ruleName },
        bindings: unifyRes,
      });
    }
  }
  const after = performance.now();
  joinStats.recordsJoined += otherRelation.size;
  joinStats.joinTimeMS += after - before;
  return results;
}

export function doQuery(graph: RuleGraph, query: Rec): Res[] {
  const node = graph.nodes.get(query.relation);
  if (!node) {
    // TODO: maybe start using result type
    throw new Error(`no such relation: ${query.relation}`);
  }
  return node.cache
    .map((res) => {
      const bindings = unify({}, res.term, query);
      if (bindings === null) {
        return null;
      }
      return { term: res.term, bindings };
    })
    .filter((x) => x !== null)
    .toArray();
}

// helpers

function addToCache(graph: RuleGraph, nodeID: NodeID, res: Res): RuleGraph {
  const cache = graph.nodes.get(nodeID).cache;
  const newCache = cache.push(res);
  return {
    ...graph,
    nodes: graph.nodes.set(nodeID, {
      ...graph.nodes.get(nodeID),
      cache: newCache,
    }),
  };
}

// TODO: retractStep
