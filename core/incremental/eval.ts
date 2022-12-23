import {
  RuleGraph,
  NodeID,
  JoinDesc,
  NodeDesc,
  MessagePayload,
  Message,
  NegationState,
  NegationDesc,
  emptyNegationState,
  markDone,
  EmissionLog,
  EmissionBatch,
} from "./types";
import {
  baseFactTrace,
  Bindings,
  BindingsWithTrace,
  builtinTrace,
  Rec,
  Res,
  Term,
  UserError,
} from "../types";
import { substitute, unify, unifyBindings } from "../unify";
import { getIndexKey, getIndexName } from "./build";
import Denque from "denque";
import { evalBuiltin } from "../evalBuiltin";
import { Catalog } from "./catalog";
import { ppt } from "../pretty";

export function insertFact(
  graph: RuleGraph,
  rec: Rec
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const iter = getPropagator(graph, rec);
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
      graph = insertFact(graph, rec).newGraph;
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
      // TODO: this is awkward, and possibly not correct?
      const bindings = unify(res.bindings, res.term, query);
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
  bindings: BindingsWithTrace
): { newGraph: RuleGraph; emissionLog: EmissionLog } {
  const iter: Propagator = {
    graph,
    queue: new Denque<Message>([
      {
        destination: nodeID,
        origin: null,
        payload: { type: "Bindings", bindings },
      },
    ]),
  };
  return stepPropagatorAll(graph, iter);
}

function getPropagator(graph: RuleGraph, rec: Rec): Propagator {
  const queue: Message[] = [
    {
      payload: {
        type: "Record",
        rec,
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
    case "Bindings": {
      const res: Res = {
        bindings: outMessage.bindings.bindings,
        trace: outMessage.bindings.trace,
        term: null,
      };
      return addToCache(newGraph, curNodeID, res);
    }
    case "Record": {
      const res: Res = {
        bindings: {},
        trace: baseFactTrace,
        term: outMessage.rec,
      };
      return addToCache(newGraph, curNodeID, res);
    }
    case "MarkDone":
      return newGraph;
  }
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
  const payload = msg.payload;
  switch (nodeDesc.type) {
    case "Union":
      return [nodeDesc, payload.type === "Bindings" ? [payload] : []];
    case "Join": {
      if (payload.type === "MarkDone") {
        return [nodeDesc, []];
      }
      if (payload.type === "Record") {
        throw new Error("Join type not receive messages of type Record");
      }
      const results =
        msg.origin === nodeDesc.leftID
          ? doJoin(graph, payload.bindings, nodeDesc, nodeDesc.rightID)
          : doJoin(graph, payload.bindings, nodeDesc, nodeDesc.leftID);
      return [
        nodeDesc,
        results.map((bindings) => ({ type: "Bindings", bindings })),
      ];
    }
    case "Match": {
      if (payload.type === "MarkDone") {
        return [nodeDesc, []];
      }
      if (payload.type === "Bindings") {
        throw new Error(
          "Match nodes should not receive messages of type Bindings"
        );
      }

      const bindings = unify({}, nodeDesc.rec, payload.rec);
      if (bindings === null) {
        return [nodeDesc, []];
      }
      for (let key of Object.keys(bindings)) {
        // console.log({ bindings, key });
        if (bindings[key].type === "Var") {
          return [nodeDesc, []];
        }
      }

      return [
        nodeDesc,
        [
          {
            type: "Bindings",
            bindings: {
              bindings,
              trace: {
                type: "MatchTrace",
                fact: { term: payload.rec, trace: baseFactTrace, bindings: {} },
                match: nodeDesc.rec,
              },
            },
          },
        ],
      ];
    }
    case "Substitute":
      if (payload.type === "MarkDone") {
        return [nodeDesc, []];
      }
      if (payload.type === "Record") {
        throw new Error("Substitute nodes should not get Record messages");
      }
      const rec = substitute(nodeDesc.rec, payload.bindings.bindings);
      // console.log("substitute", {
      //   inBindings: ppb(ins.res.bindings),
      //   sub: ppt(nodeDesc.rec),
      //   out: ppt(rec),
      // });
      return [nodeDesc, [{ type: "Record", rec: rec as Rec }]];
    case "BaseFactTable":
      return [nodeDesc, payload.type === "Record" ? [payload] : []];
    case "Builtin":
      // TODO: does this make sense?
      return [nodeDesc, payload.type === "Bindings" ? [payload] : []];
    case "Negation": {
      switch (payload.type) {
        case "Bindings": {
          const newDesc = updateNegationState(
            nodeDesc,
            msg.origin,
            payload.bindings
          );
          return [newDesc, []];
        }
        case "MarkDone": {
          const newNodeDesc: NodeDesc = {
            ...nodeDesc,
            state: emptyNegationState,
          };
          const messages = processNegation(graph, nodeDesc);
          return [newNodeDesc, messages];
        }
        case "Record":
          throw new Error(
            "Negation nodes not supposed to receive Record messages"
          );
      }
    }
    case "Aggregation":
      throw new Error("can't handle aggregation yet");
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

function updateNegationState(
  nodeDesc: NegationDesc,
  origin: NodeID,
  bindings: BindingsWithTrace
): NegationDesc {
  const oldState = nodeDesc.state;
  const newState: NegationState =
    origin === nodeDesc.joinDesc.leftID
      ? {
          ...oldState,
          receivedNormal: [...oldState.receivedNormal, bindings],
        }
      : {
          ...oldState,
          receivedNegated: [...oldState.receivedNegated, bindings],
        };
  return { ...nodeDesc, state: newState };
}

function processNegation(
  graph: RuleGraph,
  desc: NegationDesc
): MessagePayload[] {
  // tuples from the normal side that don't join against the negated side
  const negatedJoinResults = desc.state.receivedNormal.filter(
    (bindings) =>
      doJoin(graph, bindings, desc.joinDesc, desc.joinDesc.rightID).length === 0
  );
  // TODO: other direction (i.e. ones which need to be retracted)
  return negatedJoinResults.map((bindings) => ({ type: "Bindings", bindings }));
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
  bindings: BindingsWithTrace,
  joinDesc: JoinDesc,
  otherNodeID: NodeID
): BindingsWithTrace[] {
  const thisVars = bindings;
  const otherNode = graph.nodes.get(otherNodeID);
  if (otherNode.desc.type === "Builtin") {
    const results = evalBuiltin(otherNode.desc.rec, thisVars.bindings);
    return results.map((res) => ({
      bindings: unifyBindings(res.bindings, thisVars.bindings),
      trace: builtinTrace,
    }));
  }
  // TODO: avoid this allocation
  const indexName = getIndexName(joinDesc.joinVars);
  const indexKey = getIndexKey(thisVars.bindings, joinDesc.joinVars);
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
  const results: BindingsWithTrace[] = [];
  for (let possibleOtherMatch of otherEntries) {
    const otherVars = possibleOtherMatch;
    // TODO: just loop through the join vars?
    const unifyRes = unifyBindings(
      thisVars.bindings || {},
      otherVars.bindings || {}
    );
    // console.log("join", {
    //   left: ppb(thisVars),
    //   right: ppb(otherVars),
    //   unifyRes: ppb(unifyRes),
    // });
    if (unifyRes !== null) {
      results.push({
        bindings: unifyRes,
        trace: { type: "JoinTrace", sources: [thisVars, otherVars] },
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

// TODO: move these up into core?

function getAtPath(term: Term, path: string[]): Term {
  return getAtPathRecur(term, path, 0);
}

function getAtPathRecur(term: Term, path: string[], idx: number): Term {
  if (idx === path.length) {
    return term;
  }
  switch (term.type) {
    case "Record":
      return getAtPathRecur(term.attrs[path[idx]], path, idx + 1);
    case "Array":
      return getAtPathRecur(term.items[path[idx]], path, idx + 1);
    case "Dict":
      return getAtPathRecur(term.map[path[idx]], path, idx + 1);
    default:
      throw new Error(`no attribute ${path[idx]} of term ${ppt(term)}`);
  }
}
