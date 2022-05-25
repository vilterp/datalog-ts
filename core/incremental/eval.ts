import { RuleGraph, NodeID, JoinDesc } from "./types";
import { Rec, Res, Rule, UserError } from "../types";
import { applyMappings, substitute, unify, unifyBindings } from "../unify";
import { filterMap, flatMap, mapObjToList } from "../../util/util";
import {
  addEdge,
  addNodeKnownID,
  addOr,
  addUnmappedRule,
  getIndexKey,
  getIndexName,
  resolveUnmappedRules,
} from "./build";
import Denque from "denque";
import { ppr } from "../pretty";
import { BUILTINS } from "../builtins";
import { evalBuiltin } from "../evalBuiltin";

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
  const {
    newGraph: withOr,
    tipID: orID,
    newNodeIDs,
  } = addOr(graph, rule.head.relation, rule.body);
  const withSubst = addNodeKnownID(substID, withOr, false, {
    type: "Substitute",
    rec: rule.head,
  });
  newNodeIDs.add(substID); // TODO: weird mix of mutation and non-mutation here...?
  const withEdge = addEdge(withSubst, orID, substID);
  const withUnmapped = addUnmappedRule(withEdge, rule, newNodeIDs);
  const resultGraph = resolveUnmappedRules(withUnmapped);
  if (Object.keys(resultGraph.unmappedRules).length === 0) {
    const nodesToReplay = new Set([
      ...flatMap(
        Object.values(withUnmapped.unmappedRules).map(({ rule }) => rule),
        getRoots
      ),
    ]);
    return addRuleToRes(
      rule,
      replayFacts(resultGraph, newNodeIDs, nodesToReplay)
    );
  }
  return addRuleToRes(rule, {
    newGraph: resultGraph,
    emissionLog: [],
  });
}

function addRuleToRes(
  rule: Rule,
  res: { newGraph: RuleGraph; emissionLog: EmissionLog }
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  return {
    ...res,
    newGraph: {
      ...res.newGraph,
      rules: [...res.newGraph.rules, rule],
    },
  };
}

function replayFacts(
  graph: RuleGraph,
  allNewNodes: Set<NodeID>,
  roots: Set<NodeID>
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  let outGraph = graph;
  let outEmissionLog: EmissionLog = [];
  for (let rootID of roots) {
    for (let res of graph.nodes.get(rootID).cache.all()) {
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
  return flatMap(rule.body.opts, (opt) => {
    return filterMap(opt.clauses, (andClause) => {
      if (andClause.type === "Negation") {
        return andClause.record.relation;
      }
      if (andClause.type === "Aggregation") {
        return andClause.record.relation;
      }
      if (BUILTINS[andClause.relation]) {
        return null;
      }
      return andClause.relation;
    });
  });
}

export function insertFact(
  graph: RuleGraph,
  res: Res
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  if (Object.keys(graph.unmappedRules).length > 0) {
    throw new Error(
      `tried to insert fact ${ppr(
        res
      )} when some rules still rely on things not defined yet: [${mapObjToList(
        graph.unmappedRules,
        (name) => name
      ).join(", ")}]`
    );
  }

  const iter = getInsertionIterator(graph, res);
  const result = stepIteratorAll(graph, iter);

  // console.log("insertFact", { joinStats: getJoinStats() });
  // clearJoinStats();

  return result;
}

function getInsertionIterator(graph: RuleGraph, res: Res): InsertionIterator {
  const queue: Insertion[] = [
    {
      res,
      origin: null,
      destination: (res.term as Rec).relation,
    },
  ];
  return { graph, queue: new Denque(queue), mode: { type: "Playing" } };
}

function getReplayIterator(
  graph: RuleGraph,
  newNodeIDs: Set<NodeID>,
  queue: Insertion[]
): InsertionIterator {
  return {
    graph,
    queue: new Denque(queue),
    mode: { type: "Replaying", newNodeIDs },
  };
}

type InsertionIterator = {
  graph: RuleGraph;
  queue: Denque<Insertion>;
  mode: { type: "Replaying"; newNodeIDs: Set<NodeID> } | { type: "Playing" };
};

const MAX_QUEUE_SIZE = 10000;

function stepIteratorAll(
  graph: RuleGraph,
  iter: InsertionIterator
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const emissionLog: EmissionLog = [];
  let newGraph = graph;
  while (iter.queue.length > 0) {
    if (iter.queue.length > MAX_QUEUE_SIZE) {
      throw new Error("max queue size exceeded");
    }
    const emissions = stepIterator(iter);
    emissionLog.push(emissions);
    newGraph = iter.graph;
  }
  return { newGraph, emissionLog };
}

function stepIterator(iter: InsertionIterator): EmissionBatch {
  let newGraph = iter.graph;
  const insertingNow = iter.queue.shift();
  const curNodeID = insertingNow.destination;
  const results = processInsertion(iter.graph, insertingNow);
  // console.log("push", results);
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
        return doJoin(graph, ins, nodeDesc, nodeDesc.rightID);
      } else {
        return doJoin(graph, ins, nodeDesc, nodeDesc.leftID);
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
          trace: {
            type: "MatchTrace",
            fact: ins.res,
            match: nodeDesc.rec,
          },
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
          trace: {
            type: "RefTrace",
            innerRes: ins.res,
            invokeLoc: [], // TODO: ???
            mappings: {}, // TODO: ???
            refTerm: nodeDesc.rec,
          },
        },
      ];
    case "BaseFactTable":
      return [ins.res];
    case "Builtin":
      throw new Error(
        "unreachable: nothing should be sending records to a builtin"
      );
  }
}

type JoinStats = {
  joinTimeMS: number;
  inputRecords: number;
  outputRecords: number;
};

let joinStats: JoinStats = {
  joinTimeMS: 0,
  inputRecords: 0,
  outputRecords: 0,
};

export function getJoinStats(): JoinStats & { outputPct: number } {
  return {
    ...joinStats,
    outputPct: (joinStats.outputRecords / joinStats.inputRecords) * 100,
  };
}

export function clearJoinStats() {
  joinStats = { joinTimeMS: 0, inputRecords: 0, outputRecords: 0 };
}

function doJoin(
  graph: RuleGraph,
  ins: Insertion,
  joinDesc: JoinDesc,
  otherNodeID: NodeID
): Res[] {
  const thisVars = ins.res.bindings;
  const otherNode = graph.nodes.get(otherNodeID);
  if (otherNode.desc.type === "Builtin") {
    const results = evalBuiltin(otherNode.desc.rec as Rec, ins.res.bindings);
    return results.map((res) => ({
      trace: res.trace,
      term: res.term,
      bindings: unifyBindings(res.bindings, ins.res.bindings),
    }));
  }
  // TODO: avoid this allocation
  const indexName = getIndexName(joinDesc.joinVars);
  const indexKey = getIndexKey(ins.res, joinDesc.joinVars);
  const otherEntries = otherNode.cache.get(indexName, indexKey);
  // console.log("doJoin", {
  //   originID: ins.origin,
  //   joinID: ins.destination,
  //   otherID: otherNodeID,
  //   indexName,
  //   indexKey,
  //   otherEntries,
  //   cache: otherNode.cache.toJSON(),
  // });
  const results: Res[] = [];
  for (let possibleOtherMatch of otherEntries) {
    const otherVars = possibleOtherMatch.bindings;
    const unifyRes = unifyBindings(thisVars || {}, otherVars || {});
    // console.log("join", {
    //   left: ppb(thisVars),
    //   right: ppb(otherVars),
    //   unifyRes: ppb(unifyRes),
    // });
    if (unifyRes !== null) {
      results.push({
        term: null,
        bindings: unifyRes,
        trace: {
          type: "AndTrace",
          sources: [ins.res, possibleOtherMatch],
        },
      });
    }
  }
  return results;
}

export function doQuery(graph: RuleGraph, query: Rec): Res[] {
  // TODO: use index selection
  const node = graph.nodes.get(query.relation);
  if (!node) {
    // TODO: maybe start using result type
    throw new UserError(`no such relation: ${query.relation}`);
  }
  return node.cache
    .all()
    .map((res) => {
      const bindings = unify({}, res.term, query);
      if (bindings === null) {
        return null;
      }
      // TODO: should this be its own trace node??
      return { term: res.term, bindings, trace: res.trace };
    })
    .filter((x) => x !== null)
    .toArray();
}

// helpers

function addToCache(graph: RuleGraph, nodeID: NodeID, res: Res): RuleGraph {
  const cache = graph.nodes.get(nodeID).cache;
  const newCache = cache.insert(res);
  return {
    ...graph,
    nodes: graph.nodes.set(nodeID, {
      ...graph.nodes.get(nodeID),
      cache: newCache,
    }),
  };
}

// TODO: retractStep
