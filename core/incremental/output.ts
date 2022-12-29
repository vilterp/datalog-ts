import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { flatMap } from "../../util/util";
import { ppb, ppt } from "../pretty";
import { dict, rec } from "../types";
import { MessagePayload, Output, RuleGraph } from "./types";

type OutputOptions = {
  emissionLogMode: "test" | "repl";
};

export function formatOutput(
  graph: RuleGraph,
  output: Output,
  opts: OutputOptions
): TestOutput {
  switch (output.type) {
    case "Acknowledge":
      return datalogOut([]);
    case "EmissionLog":
      if (opts.emissionLogMode === "test") {
        return {
          mimeType: "incremental-datalog/trace",
          content: output.log
            .map(
              ({ fromID, output }) =>
                `${fromID}: [${output.map(formatMessagePayload).join(", ")}]`
            )
            .join("\n"),
        };
      } else {
        return datalogOut(
          flatMap(
            output.log.filter((emissionBatch) => {
              const fromNode = graph.nodes.get(emissionBatch.fromID);
              return (
                !fromNode.isInternal && fromNode.desc.type !== "BaseFactTable"
              );
            }),
            ({ output }) =>
              output.map((payload) =>
                payload.data.type === "Bindings"
                  ? rec("Bindings", {
                      bindings: dict(payload.data.bindings.bindings),
                    })
                  : rec("Record", { rec: payload.data.rec })
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

export function formatMessagePayload(payload: MessagePayload) {
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
