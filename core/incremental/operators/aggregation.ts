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
  switch (payload.type) {
    case "Data": {
      const data = payload.data;
      switch (data.type) {
        case "Bindings": {
          const groupKey = groupVars
            .map((varName) => data.bindings.bindings[varName])
            .map(fastPPT)
            .join(",");
          return [
            {
              ...nodeDesc,
              state: nodeDesc.state.update(
                groupKey,
                { state: agg.init, bindings: data.bindings.bindings },
                (groupState) => {
                  const term = data.bindings.bindings[aggVar];
                  const result = agg.step(groupState.state, term);
                  // console.log("step:", {
                  //   aggregation: nodeDesc.aggregation.aggregation,
                  //   groupKey,
                  //   term: ppt(term),
                  //   groupState: ppt(groupState.state),
                  //   result,
                  // });
                  return { ...groupState, state: result };
                }
              ),
            },
            [],
          ];
        }
        case "Record":
          throw new Error(
            "Negation nodes not supposed to receive Record messages"
          );
      }
    }
    case "MarkDone": {
      // TODO: emit negations of old values
      // console.log(
      //   "done",
      //   nodeDesc.state.mapEntries(([k, v]) => [k, ppt(v.state)]).toJSON()
      // );
      return [
        nodeDesc,
        nodeDesc.state
          .map((groupState): MessagePayload => {
            const bindings: Bindings = {};
            groupVars.forEach((varName, i) => {
              bindings[varName] = groupState.bindings[varName];
            });
            bindings[aggVar] = groupState.state;
            return {
              type: "Data",
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
          .toArray(),
      ];
    }
  }
}
