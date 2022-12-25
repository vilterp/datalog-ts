import {
  RuleGraph,
  NodeID,
  NodeDesc,
  MessagePayload,
  Message,
  markDone,
  EmissionLog,
  EmissionBatch,
} from "./types";
import {
  baseFactTrace,
  BindingsWithTrace,
  builtinTrace,
  Rec,
  Res,
  UserError,
} from "../types";
import { unify } from "../unify";
import Denque from "denque";
import { evalBuiltin } from "../evalBuiltin";
import { Catalog } from "./catalog";
import { processMessage } from "./operators";

export function insertOrRetractFact(
  graph: RuleGraph,
  rec: Rec,
  multiplicity: number // 1: insert. -1: retract.
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const iter = getPropagator(graph, rec, multiplicity);
  const result = stepPropagatorAll(graph, iter);
  return {
    ...result,
    newGraph: advanceEpoch(result.newGraph),
  };
}

function advanceEpoch(ruleGraph: RuleGraph): RuleGraph {
  return { ...ruleGraph, currentEpoch: ruleGraph.currentEpoch + 1 };
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
      graph = insertFromNode(graph, nodeID, {
        bindings: res.bindings,
        trace: builtinTrace,
      }).newGraph;
    });
  });
  Object.entries(catalog).forEach(([relName, rel]) => {
    if (rel.type === "Rule") {
      return;
    }
    rel.records.forEach((rec) => {
      graph = insertOrRetractFact(graph, rec, 1).newGraph;
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
    .mapEntries(([res, multiplicity]) => {
      // TODO: this is awkward, and possibly not correct?
      const bindings = unify(res.bindings, res.term, query);
      if (bindings === null) {
        return null;
      }
      // TODO: should this be its own trace node??
      return [{ term: res.term, bindings, trace: res.trace }, multiplicity];
    })
    .keySeq()
    .toArray();
}

function insertFromNode(
  graph: RuleGraph,
  nodeID: NodeID,
  bindings: BindingsWithTrace
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const iter: Propagator = {
    graph,
    queue: new Denque<Message>([
      {
        destination: nodeID,
        origin: null,
        payload: {
          type: "Data",
          multiplicity: 1,
          data: { type: "Bindings", bindings },
        },
      },
    ]),
  };
  return stepPropagatorAll(graph, iter);
}

function getPropagator(
  graph: RuleGraph,
  rec: Rec,
  multiplicity: number
): Propagator {
  const queue: Message[] = [
    {
      payload: {
        type: "Data",
        multiplicity,
        data: {
          type: "Record",
          rec,
        },
      },
      origin: null,
      destination: rec.relation,
    },
    { payload: markDone, origin: null, destination: rec.relation },
  ];
  return { graph, queue: new Denque(queue) };
}

type Propagator = {
  graph: RuleGraph;
  queue: Denque<Message>;
};

const MAX_QUEUE_SIZE = 10_000;

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
  const [newNewGraph, additionalMessages] = markNodeDone(newGraph, curNodeID);
  newGraph = newNewGraph;
  // console.log("push", results);
  for (let outMessage of [...outMessages, ...additionalMessages]) {
    // update cache
    newGraph = handleOutMessage(newGraph, curNodeID, outMessage);
    // propagate messages
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

function handleOutMessage(
  newGraph: RuleGraph,
  curNodeID: string,
  outMessage: MessagePayload
): RuleGraph {
  switch (outMessage.type) {
    case "Data": {
      const data = outMessage.data;
      const res: Res =
        data.type === "Bindings"
          ? {
              bindings: data.bindings.bindings,
              trace: data.bindings.trace,
              term: null,
            }
          : {
              bindings: {},
              trace: baseFactTrace,
              term: data.rec,
            };
      return addToCache(newGraph, curNodeID, res, outMessage.multiplicity);
    }
    case "MarkDone":
      return newGraph;
  }
}

function markNodeDone(
  graph: RuleGraph,
  nodeID: NodeID
): [RuleGraph, MessagePayload[]] {
  const node = graph.nodes.get(nodeID);
  if (node.epochDone === graph.currentEpoch) {
    return [graph, []];
  }
  return [
    {
      ...graph,
      nodes: graph.nodes.set(nodeID, {
        ...node,
        epochDone: graph.currentEpoch,
      }),
    },
    [markDone],
  ];
}

// helpers

function addToCache(
  graph: RuleGraph,
  nodeID: NodeID,
  res: Res,
  multiplicity: number
): RuleGraph {
  const cache = graph.nodes.get(nodeID).cache;
  const newCache = cache.insert(res, multiplicity);
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
