import { RuleGraph, Message, NodeDesc, MessagePayload } from "../types";
import { processAggregation } from "./aggregation";
import { processJoin } from "./join";
import { processMatch } from "./match";
import { processNegation } from "./negation";
import { processSubstitute } from "./substitute";

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
      return [nodeDesc, [payload]];
    case "Join":
      return processJoin(graph, nodeDesc, msg.origin, payload);
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
    case "Aggregation":
      return processAggregation(nodeDesc, node.cache, msg.payload);
  }
}
