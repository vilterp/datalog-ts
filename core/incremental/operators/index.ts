import { RuleGraph, NodeDesc, MessagePayload, NodeID } from "../types";
import { processAggregation } from "./aggregation";
import { processDistinct } from "./distinct";
import { processJoin } from "./join";
import { processMatch } from "./match";
import { processNegation } from "./negation";
import { processSubstitute } from "./substitute";

// should only be used internally by eval.ts
export function processMessage(
  graph: RuleGraph,
  nodeDesc: NodeDesc,
  origin: NodeID,
  payload: MessagePayload
): MessagePayload[] {
  switch (nodeDesc.type) {
    case "Union":
      return [payload];
    case "Join":
      return processJoin(graph, nodeDesc, origin, payload);
    case "Match":
      return processMatch(nodeDesc, payload);
    case "Substitute":
      return processSubstitute(nodeDesc, payload);
    case "BaseFactTable":
      return [payload];
    case "Builtin":
      // TODO: does this make sense?
      return [payload];
    case "Negation":
      return processNegation(payload);
    case "Aggregation":
      return processAggregation(nodeDesc, payload);
    case "Distinct": {
      return processDistinct(nodeDesc, payload);
    }
  }
}
