import { RuleGraph, NodeID, JoinDesc, NodeDesc } from "./types";
import { baseFactTrace, Rec, Res, UserError } from "../types";
import { applyMappings, substitute, unify, unifyBindings } from "../unify";
import { getIndexKey, getIndexName } from "./build";
import Denque from "denque";
import { evalBuiltin } from "../evalBuiltin";
import { Catalog } from "./catalog";

export type Insertion = {
  res: Res;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type EmissionLog = EmissionBatch[];

export type EmissionBatch = { fromID: NodeID; output: Res[] };

export function insertFact(
  graph: RuleGraph,
  res: Res
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const iter = getInsertionIterator(graph, res);
  const result = stepIteratorAll(graph, iter);

  // console.log("insertFact", { joinStats: getJoinStats() });
  // clearJoinStats();

  return result;
}

export function replayFacts(ruleGraph: RuleGraph, catalog: Catalog): RuleGraph {
  let graph = ruleGraph;
  // emit from builtins
  ruleGraph.builtins.forEach((nodeID) => {
    const node = ruleGraph.nodes.get(nodeID);
    if (node.desc.type !== "Builtin") {
      throw new Error("node in builtins index not builtin");
    }
    let results: Res[] = [];
    try {
      results = evalBuiltin(node.desc.rec, {});
    } catch (e) {
      // TODO: check that it's the expected error
      return;
    }
    results.forEach((res) => {
      graph = insertFromNode(graph, nodeID, res).newGraph;
    });
  });
  Object.entries(catalog).forEach(([relName, rel]) => {
    if (rel.type === "Rule") {
      return;
    }
    rel.records.forEach((rec) => {
      graph = insertFact(graph, {
        term: rec,
        bindings: {},
        trace: baseFactTrace,
      }).newGraph;
    });
  }, ruleGraph);
  return graph;
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

function insertFromNode(
  graph: RuleGraph,
  nodeID: NodeID,
  res: Res
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const iter: InsertionIterator = {
    graph,
    queue: new Denque([
      {
        destination: nodeID,
        origin: null,
        res,
      },
    ]),
  };
  return stepIteratorAll(graph, iter);
}

function getInsertionIterator(graph: RuleGraph, res: Res): InsertionIterator {
  const queue: Insertion[] = [
    {
      res,
      origin: null,
      destination: (res.term as Rec).relation,
    },
  ];
  return { graph, queue: new Denque(queue) };
}

type InsertionIterator = {
  graph: RuleGraph;
  queue: Denque<Insertion>;
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
  const [newNodeDesc, results] = processInsertion(iter.graph, insertingNow);
  newGraph = updateNodeDesc(newGraph, curNodeID, newNodeDesc);
  // console.log("push", results);
  for (let result of results) {
    newGraph = addToCache(newGraph, curNodeID, result);
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
function processInsertion(graph: RuleGraph, ins: Insertion): [NodeDesc, Res[]] {
  const node = graph.nodes.get(ins.destination);
  if (!node) {
    throw new Error(`not found: node ${ins.destination}`);
  }
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return [nodeDesc, [ins.res]];
    case "Join": {
      if (ins.origin === nodeDesc.leftID) {
        return [nodeDesc, doJoin(graph, ins, nodeDesc, nodeDesc.rightID)];
      } else {
        return [nodeDesc, doJoin(graph, ins, nodeDesc, nodeDesc.leftID)];
      }
    }
    case "Match": {
      const mappedBindings = applyMappings(nodeDesc.mappings, ins.res.bindings);
      const bindings = unify(mappedBindings, nodeDesc.rec, ins.res.term);
      if (bindings === null) {
        return [nodeDesc, []];
      }
      for (let key of Object.keys(bindings)) {
        // console.log({ bindings, key });
        if (bindings[key].type === "Var") {
          return [nodeDesc, []];
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
        nodeDesc,
        [
          {
            term: ins.res.term,
            bindings: bindings,
            trace: {
              type: "MatchTrace",
              fact: ins.res,
              match: nodeDesc.rec,
            },
          },
        ],
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
        nodeDesc,
        [
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
        ],
      ];
    case "BaseFactTable":
      return [nodeDesc, [ins.res]];
    case "Builtin":
      // TODO: does this make sense?
      return [nodeDesc, [ins.res]];
    case "Negation":
      // return [{ ...nodeDesc, received: nodeDesc.received + 1 }, []];
      throw new Error("can't handle negation yet");
    case "Aggregation":
      throw new Error("can't handle aggregation yet");
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

// helpers

function addToCache(graph: RuleGraph, nodeID: NodeID, res: Res): RuleGraph {
  const cache = graph.nodes.get(nodeID).cache;
  const newCache = cache.insert(res);
  // TODO: use Map#update?
  return {
    ...graph,
    nodes: graph.nodes.set(nodeID, {
      ...graph.nodes.get(nodeID),
      cache: newCache,
    }),
  };
}

function updateNodeDesc(
  graph: RuleGraph,
  nodeID: NodeID,
  newDesc: NodeDesc
): RuleGraph {
  // TODO: use Map#update?
  return {
    ...graph,
    nodes: graph.nodes.set(nodeID, {
      ...graph.nodes.get(nodeID),
      desc: newDesc,
    }),
  };
}
