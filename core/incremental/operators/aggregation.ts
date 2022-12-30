import { AGGREGATIONS } from "../../aggregations";
import { fastPPT } from "../../fastPPT";
import { ppb } from "../../pretty";
import { aggTraceForInner, Bindings } from "../../types";
import { AggregationDesc, MessagePayload } from "../types";

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
  const data = payload.data;
  switch (data.type) {
    case "Record":
      throw new Error("Negation nodes not supposed to receive Record messages");
    case "Bindings": {
      const groupKey = groupVars
        .map((varName) => data.bindings.bindings[varName])
        .map(fastPPT)
        .join(",");
      const curGroupState = nodeDesc.state.getWithDefault(groupKey, agg.init);
      const term = data.bindings.bindings[aggVar];
      const newGroupState = agg.step(curGroupState, term, payload.multiplicity);
      const newNodeState: AggregationDesc = {
        ...nodeDesc,
        state: nodeDesc.state.set(groupKey, newGroupState),
      };

      const oldBindings: Bindings = {};
      const newBindings: Bindings = {};
      for (const varName of groupVars) {
        const val = data.bindings.bindings[varName];
        oldBindings[varName] = val;
        newBindings[varName] = val;
      }
      oldBindings[aggVar] = curGroupState;
      newBindings[aggVar] = newGroupState;

      // console.log("step:", {
      //   aggregation: nodeDesc.aggregation.aggregation,
      //   groupKey,
      //   oldBindings: ppb(oldBindings),
      //   newBindings: ppb(newBindings),
      // });

      const out: MessagePayload[] = [];
      if (nodeDesc.state.has(groupKey)) {
        out.push({
          multiplicity: -1,
          data: {
            type: "Bindings",
            bindings: {
              bindings: oldBindings,
              trace: aggTraceForInner,
            },
          },
        });
      }
      out.push({
        multiplicity: 1,
        data: {
          type: "Bindings",
          bindings: {
            bindings: newBindings,
            trace: aggTraceForInner,
          },
        },
      });

      return [newNodeState, out];
    }
  }
}
