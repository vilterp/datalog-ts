import { AGGREGATIONS, GroupInfo } from "../../aggregations";
import { fastPPT } from "../../fastPPT";
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
      const hadGroupKey = nodeDesc.state.has(groupKey);
      const curGroupState = nodeDesc.state.getWithDefault(groupKey, agg.init);
      const groupBindings: Bindings = {};
      groupVars.forEach((groupVar) => {
        groupBindings[groupVar] = data.bindings.bindings[groupVar];
      });
      const groupInfo: GroupInfo = {
        groupBindings,
        aggVar,
      };
      const newGroupState = agg.step(
        curGroupState,
        groupInfo,
        data.bindings.bindings,
        payload.multiplicity
      );
      // TODO: just mutate it
      const newNodeState: AggregationDesc = {
        ...nodeDesc,
        state: nodeDesc.state.set(groupKey, newGroupState),
      };

      const oldBindings: Bindings = agg.final(curGroupState, groupInfo);
      const newBindings: Bindings = agg.final(newGroupState, groupInfo);

      // console.log("step:", {
      //   aggregation: nodeDesc.aggregation.aggregation,
      //   groupKey,
      //   oldBindings: ppb(oldBindings),
      //   newBindings: ppb(newBindings),
      // });

      const out: MessagePayload[] = [];
      if (hadGroupKey) {
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
