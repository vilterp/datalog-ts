import { BindingsWithTrace } from "../../types";
import {
  RuleGraph,
  NegationDesc,
  MessagePayload,
  NodeID,
  NegationState,
  emptyNegationState,
  BindingsWithMultiplicity,
} from "../types";
import { doJoin } from "./join";

export function processNegation(
  graph: RuleGraph,
  nodeDesc: NegationDesc,
  origin: NodeID,
  payload: MessagePayload
): [NegationDesc, MessagePayload[]] {
  switch (payload.type) {
    case "Data": {
      const data = payload.data;
      switch (data.type) {
        case "Bindings": {
          const newDesc = processBindings(nodeDesc, origin, {
            bindings: data.bindings,
            multiplicity: payload.multiplicity,
          });
          return [newDesc, []];
        }
        case "Record":
          throw new Error(
            "Negation nodes not supposed to receive Record messages"
          );
      }
    }
    case "MarkDone": {
      const newNodeDesc: NegationDesc = {
        ...nodeDesc,
        state: emptyNegationState,
      };
      const messages = processMarkDone(graph, nodeDesc);
      return [newNodeDesc, messages];
    }
  }
}

function processMarkDone(
  graph: RuleGraph,
  desc: NegationDesc
): MessagePayload[] {
  // TODO: use a negate node and do a single join here
  // tuples from the normal side that don't join against the negated side
  const negatedJoinResults = desc.state.receivedNormal.filter(
    (bindings) =>
      doJoin(graph, bindings, desc.joinDesc, desc.joinDesc.rightID).length === 0
  );
  // new tuples on the negated side that mean we have to retract things
  const normalJoinResults = desc.state.receivedNegated.filter(
    (bindings) =>
      doJoin(graph, bindings, desc.joinDesc, desc.joinDesc.leftID).length === 0
  );
  return [
    ...negatedJoinResults.map(
      (bwm): MessagePayload => ({
        type: "Data",
        multiplicity: bwm.multiplicity,
        data: { type: "Bindings", bindings: bwm.bindings },
      })
    ),
    ...normalJoinResults.map(
      (bwm): MessagePayload => ({
        type: "Data",
        multiplicity: -bwm.multiplicity,
        data: { type: "Bindings", bindings: bwm.bindings },
      })
    ),
  ];
}

function processBindings(
  nodeDesc: NegationDesc,
  origin: NodeID,
  bindings: BindingsWithMultiplicity
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
