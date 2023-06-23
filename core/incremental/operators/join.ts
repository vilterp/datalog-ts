import { evalBuiltin } from "../../evalBuiltin";
import { ppt } from "../../pretty";
import { BindingsWithTrace, builtinTrace } from "../../types";
import { unifyBindings } from "../../unify";
import { getIndexName, getIndexKey } from "../build";
import {
  RuleGraph,
  JoinDesc,
  NodeID,
  MessagePayload,
  BindingsWithMultiplicity,
} from "../types";

export function processJoin(
  graph: RuleGraph,
  nodeDesc: JoinDesc,
  origin: NodeID,
  payload: MessagePayload
): MessagePayload[] {
  const data = payload.data;
  if (data.type === "Record") {
    throw new Error("Join type not receive messages of type Record");
  }
  const bwm: BindingsWithMultiplicity = {
    bindings: data.bindings,
    multiplicity: payload.multiplicity,
  };
  const results =
    origin === nodeDesc.leftID
      ? doJoin(graph, bwm, nodeDesc, nodeDesc.rightID)
      : doJoin(graph, bwm, nodeDesc, nodeDesc.leftID);
  return results.map(({ bindings, multiplicity }) => ({
    type: "Data",
    multiplicity,
    data: { type: "Bindings", bindings },
  }));
}

export function doJoin(
  graph: RuleGraph,
  bindings: BindingsWithMultiplicity,
  joinDesc: JoinDesc,
  otherNodeID: NodeID
): BindingsWithMultiplicity[] {
  const thisVars = bindings;
  const otherNode = graph.nodes.get(otherNodeID);
  if (otherNode.desc.type === "Builtin") {
    const results = evalBuiltin(otherNode.desc.rec, thisVars.bindings.bindings);
    console.log(
      "eval builtin",
      ppt(otherNode.desc.rec),
      results.map((r) => ppt(r.term))
    );
    return results.map((res) => ({
      bindings: {
        bindings: unifyBindings(res.bindings, thisVars.bindings.bindings),
        trace: builtinTrace,
      },
      multiplicity: bindings.multiplicity,
    }));
  }
  const indexName = getIndexName(joinDesc.joinVars);
  const indexKey = getIndexKey(thisVars.bindings.bindings, joinDesc.joinVars);
  const otherEntries = otherNode.cache.getByIndex(indexName, indexKey);
  // console.log("doJoin", {
  //   originID: ins.origin,
  //   joinID: ins.destination,
  //   otherID: otherNodeID,
  //   indexName,
  //   indexKey,
  //   otherEntries,
  //   cache: otherNode.cache.toJSON(),
  // });
  const results: { bindings: BindingsWithTrace; multiplicity: number }[] = [];
  for (let {
    item: possibleOtherMatch,
    mult: otherMultiplicity,
  } of otherEntries) {
    const otherVars = possibleOtherMatch;
    // TODO: just loop through the join vars?
    const unifyRes = unifyBindings(
      thisVars.bindings.bindings || {},
      otherVars.bindings || {}
    );
    // console.log("join", {
    //   left: ppb(thisVars),
    //   right: ppb(otherVars),
    //   unifyRes: ppb(unifyRes),
    // });
    if (unifyRes !== null) {
      results.push({
        bindings: {
          bindings: unifyRes,
          trace: { type: "JoinTrace", sources: [thisVars.bindings, otherVars] },
        },
        multiplicity: thisVars.multiplicity * otherMultiplicity,
      });
    }
  }
  return results;
}
