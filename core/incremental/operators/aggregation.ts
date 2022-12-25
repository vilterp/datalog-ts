import { AGGREGATIONS } from "../../aggregations";
import { fastPPT } from "../../fastPPT";
import { Bindings } from "../../types";
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
      const curGroupState = nodeDesc.state.get(groupKey, {
        state: agg.init,
        bindings: data.bindings.bindings,
      });
      const term = data.bindings.bindings[aggVar];
      const result = agg.step(curGroupState.state, term);
      const newGroupState = {
        ...curGroupState,
        state: result,
      };
      // console.log("step:", {
      //   aggregation: nodeDesc.aggregation.aggregation,
      //   groupKey,
      //   term: ppt(term),
      //   groupState: ppt(groupState.state),
      //   result,
      // });
      const newState: AggregationDesc = {
        ...nodeDesc,
        state: nodeDesc.state.set(groupKey, newGroupState),
      };
      // TODO: negate old aggregations
      const messages: MessagePayload[] = nodeDesc.state
        .map((groupState): MessagePayload => {
          const bindings: Bindings = {};
          groupVars.forEach((varName, i) => {
            bindings[varName] = groupState.bindings[varName];
          });
          bindings[aggVar] = newGroupState.state;
          return {
            multiplicity: 1,
            data: {
              type: "Bindings",
              bindings: {
                bindings,
                trace: { type: "AggregationTraceForIncr" },
              },
            },
          };
        })
        .valueSeq()
        .toArray();
      return [newState, messages];
    }
  }
}
