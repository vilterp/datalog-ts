import { ppt } from "../../pretty";
import { formatMessagePayload } from "../output";
import { RuleGraph, Message, NodeDesc, MessagePayload, NodeID } from "../types";
import { processAggregation } from "./aggregation";
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
): [NodeDesc, MessagePayload[]] {
  switch (nodeDesc.type) {
    case "Union":
      return [nodeDesc, [payload]];
    case "Join":
      return processJoin(graph, nodeDesc, origin, payload);
    case "Match":
      return processMatch(nodeDesc, payload);
    case "Substitute":
      return processSubstitute(nodeDesc, payload);
    case "BaseFactTable":
      return [nodeDesc, [payload]];
    case "Builtin":
      // TODO: does this make sense?
      return [nodeDesc, [payload]];
    case "Negation":
      return [nodeDesc, processNegation(payload)];
    case "Aggregation": {
      const res = processAggregation(nodeDesc, payload);
      console.log(
        ppt(nodeDesc.aggregation),
        "========",
        formatMessagePayload(payload),
        "===========>",
        res[1].map(formatMessagePayload)
      );
      return res;
    }
  }
}
