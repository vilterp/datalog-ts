import { AGGREGATIONS } from "../../aggregations";
import { Bindings } from "../../types";
import { AggregationDesc, MessagePayload, BindingsMsg } from "../types";

export function processAggregation(
  nodeDesc: AggregationDesc,
  payload: MessagePayload
): [AggregationDesc, MessagePayload[]] {
  const aggregation = nodeDesc.aggregation;
  const aggVar = aggregation.varNames[aggregation.varNames.length - 1];
  const agg = AGGREGATIONS[aggregation.aggregation];
  const groupVars = aggregation.varNames.slice(
    0,
    aggregation.varNames.length - 1
  );
  switch (payload.type) {
    case "Bindings": {
      const groupKey = groupVars.map(
        (varName) => payload.bindings.bindings[varName]
      );
      return [
        {
          ...nodeDesc,
          state: nodeDesc.state.update(groupKey, agg.init, (groupState) => {
            const term = payload.bindings.bindings[aggVar];
            return agg.step(groupState, term);
          }),
        },
        [],
      ];
    }
    case "MarkDone": {
      // TODO: emit negations of old values
      return [
        nodeDesc,
        nodeDesc.state
          .map((groupState, groupKey): BindingsMsg => {
            const bindings: Bindings = {};
            groupVars.forEach((varName, i) => {
              bindings[varName] = groupKey[i];
            });
            bindings[aggVar] = groupState;
            return {
              type: "Bindings",
              bindings: {
                bindings,
                trace: { type: "AggregationTraceForIncr" },
              },
            };
          })
          .valueSeq()
          .toArray(),
      ];
    }
    case "Record":
      throw new Error("Negation nodes not supposed to receive Record messages");
  }
}
