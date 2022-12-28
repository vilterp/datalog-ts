import {
  datalogOut,
  datalogOutResults,
  TestOutput,
} from "../../util/ddTest/types";
import { flatMap } from "../../util/util";
import { ppb, ppt } from "../pretty";
import { dict, int, rec, str } from "../types";
import { MessagePayload, Output, RuleGraph } from "./types";

export function formatOutput(graph: RuleGraph, output: Output): TestOutput {
  switch (output.type) {
    case "Acknowledge":
      return datalogOut([]);
    case "EmissionLog":
      return datalogOut(
        flatMap(output.log, (logEntry, idx) =>
          logEntry.output.map((message) =>
            rec("step", {
              step: int(idx),
              node: str(logEntry.nodeID),
              multiplicity: int(message.multiplicity),
              message:
                message.data.type === "Bindings"
                  ? rec("bindings", {
                      bindings: dict(message.data.bindings.bindings),
                    })
                  : rec("record", { rec: message.data.rec }),
            })
          )
        )
      );
    case "QueryResults":
      return datalogOut(output.results.map((res) => res.term));
    case "Trace":
      return {
        content: JSON.stringify(output.logAndGraph),
        mimeType: "incremental-datalog/trace",
      };
  }
}

function formatMessagePayload(payload: MessagePayload) {
  switch (payload.data.type) {
    case "Bindings":
      return `${ppb(payload.data.bindings.bindings)}${formatMultiplicity(
        payload.multiplicity
      )}`;
    case "Record":
      return `${ppt(payload.data.rec)}${formatMultiplicity(
        payload.multiplicity
      )}`;
  }
}

function formatMultiplicity(mul: number) {
  if (mul === 0) {
    return "+0";
  }
  if (mul < 0) {
    return mul.toString();
  }
  return `+${mul}`;
}
