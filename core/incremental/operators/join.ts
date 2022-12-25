import { evalBuiltin } from "../../evalBuiltin";
import { BindingsWithTrace, builtinTrace } from "../../types";
import { unifyBindings } from "../../unify";
import { getIndexName, getIndexKey } from "../build";
import { RuleGraph, JoinDesc, NodeID, MessagePayload } from "../types";

export function processJoin(
  graph: RuleGraph,
  nodeDesc: JoinDesc,
  origin: NodeID,
  payload: MessagePayload
): [JoinDesc, MessagePayload[]] {
  if (payload.type === "MarkDone") {
    return [nodeDesc, []];
  }
  const data = payload.data;
  if (data.type === "Record") {
    throw new Error("Join type not receive messages of type Record");
  }
  const results =
    origin === nodeDesc.leftID
      ? doJoin(graph, data.bindings, nodeDesc, nodeDesc.rightID)
      : doJoin(graph, data.bindings, nodeDesc, nodeDesc.leftID);
  return [
    nodeDesc,
    results.map((bindings) => ({
      type: "Data",
      multiplicity: 1,
      data: { type: "Bindings", bindings },
    })),
  ];
}

export function doJoin(
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
  for (let possibleOtherMatch of otherEntries.keySeq()) {
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
