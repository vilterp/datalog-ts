import { BindingsWithTrace } from "../../types";
import {
  RuleGraph,
  NegationDesc,
  MessagePayload,
  NodeID,
  NegationState,
  emptyNegationState,
} from "../types";
import { doJoin } from "./join";

export function processNegation(
  graph: RuleGraph,
  nodeDesc: NegationDesc,
  origin: NodeID,
  payload: MessagePayload
): [NegationDesc, MessagePayload[]] {
  switch (payload.type) {
    case "Bindings": {
      const newDesc = processBindings(nodeDesc, origin, payload.bindings);
      return [newDesc, []];
    }
    case "MarkDone": {
      const newNodeDesc: NegationDesc = {
        ...nodeDesc,
        state: emptyNegationState,
      };
      const messages = processMarkDone(graph, nodeDesc);
      return [newNodeDesc, messages];
    }
    case "Record":
      throw new Error("Negation nodes not supposed to receive Record messages");
  }
}

function processMarkDone(
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

function processBindings(
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
