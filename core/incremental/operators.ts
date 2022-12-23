import { evalBuiltin } from "../evalBuiltin";
import { baseFactTrace, BindingsWithTrace, builtinTrace, Rec } from "../types";
import { unify, substitute, unifyBindings } from "../unify";
import { getIndexName, getIndexKey } from "./build";
import {
  emptyNegationState,
  JoinDesc,
  Message,
  MessagePayload,
  NegationDesc,
  NegationState,
  NodeDesc,
  NodeID,
  RuleGraph,
} from "./types";

// === logic for individual operators ===

// should only be used internally by eval.ts
export function processMessage(
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
