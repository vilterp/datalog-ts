import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { flatMap } from "../../util/util";
import { dict, int, Rec, rec, str } from "../types";
import { MessagePayload, Output, RuleGraph } from "./types";

export function formatOutput(graph: RuleGraph, output: Output): TestOutput {
  switch (output.type) {
    case "Acknowledge":
      return datalogOut([]);
    case "EmissionLog": {
      return datalogOut(
        flatMap(output.log, (logEntry, idx) =>
          logEntry.output.map((outputMessage) =>
            rec("eval.step", {
              step: int(idx),
              node: str(logEntry.nodeID),
              multiplicity: int(outputMessage.multiplicity),
              input: messageToDL(logEntry.input),
              output: messageToDL(outputMessage),
            })
          )
        )
      );
    }
    case "QueryResults":
      return datalogOut(output.results.map((res) => res.term));
    case "Trace":
      return {
        content: JSON.stringify(output.logAndGraph),
        mimeType: "incremental-datalog/trace",
      };
  }
}

function messageToDL(message: MessagePayload): Rec {
  return message.data.type === "Bindings"
    ? rec("bindings", {
        bindings: dict(message.data.bindings.bindings),
      })
    : rec("record", { rec: message.data.rec });
}
