import { RuleGraph, Res, NodeID, JoinDesc } from "./types";
import { Rec, Rule } from "../types";
import { applyMappings, substitute, unify, unifyVars } from "../unify";
import { ppb, ppr, ppRule, ppt, ppVM } from "../pretty";
import { evalBinExpr } from "../binExpr";
import { filterMap, flatMap, mapObjToList } from "../util";
import {
  addEdge,
  addNodeKnownID,
  addOr,
  addUnmappedRule,
  getIndexKey,
  getIndexName,
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

export function addRule(graph: RuleGraph, rule: Rule): EmissionLog {
  // console.log("add", rule.head.relation);
  const substID = rule.head.relation;
  const { tipID: orID, newNodeIDs } = addOr(
    graph,
    rule.head.relation,
    rule.defn
  );
  addNodeKnownID(substID, graph, false, {
    type: "Substitute",
    rec: rule.head,
  });
  newNodeIDs.add(substID); // TODO: weird mix of mutation and non-mutation here...?
  addEdge(graph, orID, substID);
  addUnmappedRule(graph, rule, newNodeIDs);
  for (let unmappedRuleName in graph.unmappedRules) {
    const rule = graph.unmappedRules[unmappedRuleName];
    resolveUnmappedRule(graph, rule.rule, rule.newNodeIDs);
  }
  if (Object.keys(graph.unmappedRules).length === 0) {
    const nodesToReplay = new Set([
      ...flatMap(
        Object.values(graph.unmappedRules).map(({ rule }) => rule),
        getRoots
      ),
    ]);
    return replayFacts(graph, newNodeIDs, nodesToReplay);
  }
  return [];
}

function replayFacts(
  graph: RuleGraph,
  allNewNodes: Set<NodeID>,
  roots: Set<NodeID>
): EmissionLog {
  // console.log("replayFacts", roots);
  let outGraph = graph;
  let outEmissionLog: EmissionLog = [];
  for (let rootID of roots) {
    for (let res of graph.nodes[rootID].cache.all()) {
      for (let destination of graph.edges[rootID]) {
        const iter = getReplayIterator(outGraph, allNewNodes, [
          {
            res,
            origin: rootID,
            destination,
          },
        ]);
        const emissionLog = stepIteratorAll(outGraph, iter);
        for (let emission of emissionLog) {
          outEmissionLog.push(emission);
        }
      }
    }
  }
  return outEmissionLog;
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

export function insertFact(graph: RuleGraph, rec: Rec): EmissionLog {
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

  // console.log("insertFact", { joinStats: getJoinStats() });
  // clearJoinStats();

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
): EmissionLog {
  const emissionLog: EmissionLog = [];
  while (iter.queue.length > 0) {
    const emissions = stepIterator(iter);
    emissionLog.push(emissions);
  }
  return emissionLog;
}

function stepIterator(iter: InsertionIterator): EmissionBatch {
  // console.log("stepIterator", iter.queue);
  const insertingNow = iter.queue.shift();
  const curNodeID = insertingNow.destination;
  const results = processInsertion(iter.graph, insertingNow);
  for (let result of results) {
    if (iter.mode.type === "Playing" || iter.mode.newNodeIDs.has(curNodeID)) {
      addToCache(iter.graph, curNodeID, result);
    }
    for (let destination of iter.graph.edges[curNodeID] || []) {
      iter.queue.push({
        destination,
        origin: curNodeID,
        res: result,
      });
    }
  }
  return { fromID: curNodeID, output: results };
}

// caller adds resulting facts
function processInsertion(graph: RuleGraph, ins: Insertion): Res[] {
  const node = graph.nodes[ins.destination];
  if (!node) {
    throw new Error(`not found: node ${ins.destination}`);
  }
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return [ins.res];
    case "Join": {
      if (ins.origin === nodeDesc.leftID) {
        return doJoin(
          graph,
          ins,
          nodeDesc,
          nodeDesc.rightID,
          nodeDesc.indexes.left,
          nodeDesc.indexes.right
        );
      } else {
        return doJoin(
          graph,
          ins,
          nodeDesc,
          nodeDesc.leftID,
          nodeDesc.indexes.right,
          nodeDesc.indexes.left
        );
      }
    }
    case "Match": {
      const mappedBindings = applyMappings(nodeDesc.mappings, ins.res.bindings);
      joinStats.matchUnifyCalls++;
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
  inputRecords: number;
  outputRecords: number;

  matchUnifyCalls: number;
  queryUnifyCalls: number;
};

const emptyJoinStats = () => ({
  joinTimeMS: 0,
  inputRecords: 0,
  outputRecords: 0,
  matchUnifyCalls: 0,
  queryUnifyCalls: 0,
});

let joinStats: JoinStats = emptyJoinStats();

export function getJoinStats(): JoinStats & { outputPct: number } {
  return {
    ...joinStats,
    outputPct: (joinStats.outputRecords / joinStats.inputRecords) * 100,
  };
}

export function clearJoinStats() {
  joinStats = emptyJoinStats();
}

function doJoin(
  graph: RuleGraph,
  ins: Insertion,
  joinDesc: JoinDesc,
  otherNodeID: NodeID,
  thisIndex: string[],
  otherIndex: string[]
): Res[] {
  const results: Res[] = [];
  const thisVars = ins.res.bindings;
  const otherNode = graph.nodes[otherNodeID];
  const indexName = getIndexName(otherIndex);
  const indexKey = getIndexKey(ins.res.term as Rec, thisIndex);
  const otherEntries = otherNode.cache.get(indexName, indexKey);
  // console.log({
  //   indexName,
  //   indexKey,
  //   otherEntries,
  //   cache: otherNode.cache.toJSON(),
  // });
  const before = performance.now();
  for (let possibleOtherMatch of otherEntries) {
    const otherVars = possibleOtherMatch.bindings;
    const unifyRes = unifyVars(thisVars || {}, otherVars || {});
    // console.log("join", {
    //   left: formatRes(ins.res),
    //   right: formatRes(possibleOtherMatch),
    //   unifyRes: ppb(unifyRes),
    // });
    if (unifyRes !== null) {
      results.push({
        term: { ...(ins.res.term as Rec), relation: joinDesc.ruleName },
        bindings: unifyRes,
      });
    }
  }
  const after = performance.now();
  joinStats.inputRecords += otherEntries.length;
  joinStats.outputRecords += results.length;
  joinStats.joinTimeMS += after - before;
  return results;
}

export function doQuery(graph: RuleGraph, query: Rec): Res[] {
  // TODO: use index selection
  const node = graph.nodes[query.relation];
  if (!node) {
    // TODO: maybe start using result type
    throw new Error(`no such relation: ${query.relation}`);
  }
  return node.cache
    .all()
    .map((res) => {
      joinStats.queryUnifyCalls++;
      const bindings = unify({}, res.term, query);
      if (bindings === null) {
        return null;
      }
      return { term: res.term, bindings };
    })
    .filter((x) => x !== null);
}

// helpers

function addToCache(graph: RuleGraph, nodeID: NodeID, res: Res) {
  // TODO: mutating something in an immutable map is wonky
  graph.nodes[nodeID].cache.insert(res);
}

export function clearCaches(graph: RuleGraph) {
  for (let nodeID of Object.keys(graph.nodes)) {
    const node = graph.nodes[nodeID];
    node.cache.clear();
  }
}

// TODO: retractStep
