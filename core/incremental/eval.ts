import {
  RuleGraph,
  NodeID,
  JoinDesc,
  NodeDesc,
  Insert,
  MessagePayload,
  Message,
} from "./types";
import { baseFactTrace, Rec, Res, UserError } from "../types";
import { applyMappings, substitute, unify, unifyBindings } from "../unify";
import { getIndexKey, getIndexName } from "./build";
import Denque from "denque";
import { evalBuiltin } from "../evalBuiltin";
import { Catalog } from "./catalog";

export type EmissionLog = EmissionBatch[];

export type EmissionBatch = { fromID: NodeID; output: MessagePayload[] };

export function insertFact(
  graph: RuleGraph,
  res: Res
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const iter = getPropagator(graph, res);
  const result = stepPropagatorAll(graph, iter);

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
  const iter: Propagator = {
    graph,
    queue: new Denque([
      {
        destination: nodeID,
        origin: null,
        payload: { type: "Insert", res },
      },
    ]),
  };
  return stepPropagatorAll(graph, iter);
}

function getPropagator(graph: RuleGraph, res: Res): Propagator {
  const queue: Message[] = [
    {
      payload: {
        type: "Insert",
        res,
      },
      origin: null,
      destination: (res.term as Rec).relation,
    },
  ];
  return { graph, queue: new Denque(queue) };
}

type Propagator = {
  graph: RuleGraph;
  queue: Denque<Message>;
};

const MAX_QUEUE_SIZE = 10000;

function stepPropagatorAll(
  graph: RuleGraph,
  iter: Propagator
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const emissionLog: EmissionLog = [];
  let newGraph = graph;
  while (iter.queue.length > 0) {
    if (iter.queue.length > MAX_QUEUE_SIZE) {
      throw new Error("max queue size exceeded");
    }
    const emissions = stepPropagator(iter);
    emissionLog.push(emissions);
    newGraph = iter.graph;
  }
  return { newGraph, emissionLog };
}

function stepPropagator(iter: Propagator): EmissionBatch {
  let newGraph = iter.graph;
  const insertingNow = iter.queue.shift();
  const curNodeID = insertingNow.destination;
  const [newNodeDesc, outMessages] = processMessage(iter.graph, insertingNow);
  newGraph = updateNodeDesc(newGraph, curNodeID, newNodeDesc);
  // console.log("push", results);
  for (let outMessage of outMessages) {
    if (outMessage.type === "Insert") {
      newGraph = addToCache(newGraph, curNodeID, outMessage.res);
    }
    for (let destination of newGraph.edges.get(curNodeID) || []) {
      iter.queue.push({
        destination,
        origin: curNodeID,
        payload: outMessage,
      });
    }
  }
  iter.graph = newGraph;
  return { fromID: curNodeID, output: outMessages };
}

// caller adds resulting facts

function processMessage(
  graph: RuleGraph,
  msg: Message
): [NodeDesc, MessagePayload[]] {
  const node = graph.nodes.get(msg.destination);
  if (!node) {
    throw new Error(`not found: node ${msg.destination}`);
  }
  const nodeDesc = node.desc;
  switch (nodeDesc.type) {
    case "Union":
      return [nodeDesc, [msg.payload]];
    case "Join": {
      if (msg.payload.type === "MarkDone") {
        return [nodeDesc, [msg.payload]];
      }
      const ins = msg.payload;
      const results =
        msg.origin === nodeDesc.leftID
          ? doJoin(graph, ins, nodeDesc, nodeDesc.rightID)
          : doJoin(graph, ins, nodeDesc, nodeDesc.leftID);
      return [nodeDesc, results.map((res) => ({ type: "Insert", res }))];
    }
    case "Match": {
      if (msg.payload.type === "MarkDone") {
        return [nodeDesc, [msg.payload]];
      }
      const ins = msg.payload;
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
      const res: Res = {
        term: ins.res.term,
        bindings: bindings,
        trace: {
          type: "MatchTrace",
          fact: ins.res,
          match: nodeDesc.rec,
        },
      };
      return [nodeDesc, [{ type: "Insert", res }]];
    }
    case "Substitute":
      if (msg.payload.type === "MarkDone") {
        return [nodeDesc, [msg.payload]];
      }
      const ins = msg.payload;
      const rec = substitute(nodeDesc.rec, ins.res.bindings);
      // console.log("substitute", {
      //   inBindings: ppb(ins.res.bindings),
      //   sub: ppt(nodeDesc.rec),
      //   out: ppt(rec),
      // });
      const res: Res = {
        term: rec,
        bindings: ins.res.bindings,
        trace: {
          type: "RefTrace",
          innerRes: ins.res,
          invokeLoc: [], // TODO: ???
          mappings: {}, // TODO: ???
          refTerm: nodeDesc.rec,
        },
      };
      return [nodeDesc, [{ type: "Insert", res }]];
    case "BaseFactTable":
      return [nodeDesc, [msg.payload]];
    case "Builtin":
      // TODO: does this make sense?
      return [nodeDesc, [msg.payload]];
    case "Negation": {
      // switch (msg.payload.type) {
      //   case "Insert":
      //     return [{ ...nodeDesc, received: nodeDesc.received + 1 }, []];
      //   case "MarkDone": {
      //     const newNodeDesc: NodeDesc = { ...nodeDesc, received: 0 };
      //     // negation failed, since we've received some records
      //     if (nodeDesc.received > 0) {
      //       return [newNodeDesc, [{ type: "MarkDone" }]];
      //     }
      //     const res: Res = {
      //       term: nodeDesc.rec,
      //       bindings: {}, // TODO: ???
      //       trace: { type: "NegationTrace", negatedTerm: nodeDesc.rec },
      //     };
      //     return [newNodeDesc, [{ type: "Insert", res }, { type: "MarkDone" }]];
      //   }
      // }
      throw new Error("can't handle negation yet");
    }
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
  ins: Insert,
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
  const indexName = getIndexName(joinDesc.joinInfo);
  const indexKey = getIndexKey(ins.res, joinDesc.joinInfo);
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
