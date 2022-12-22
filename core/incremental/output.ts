import {
  datalogOut,
  datalogOutResults,
  TestOutput,
} from "../../util/ddTest/types";
import { flatMap } from "../../util/util";
import { ppb, ppr } from "../pretty";
import { rec } from "../types";
import { MessagePayload, Output, RuleGraph } from "./types";

type OutputOptions = {
  emissionLogMode: "test" | "repl";
  showBindings: boolean;
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
                payload.type === "Insert"
                  ? rec("insert", { term: payload.res.term })
                  : rec("MarkDone", {})
              )
          )
        );
      }
    case "QueryResults":
      return opts.showBindings
        ? datalogOutResults(output.results)
        : datalogOut(output.results.map((res) => res.term));
    case "Trace":
      return {
        content: JSON.stringify(output.logAndGraph),
        mimeType: "incremental-datalog/trace",
      };
  }
}

function formatMessagePayload(payload: MessagePayload) {
  switch (payload.type) {
    case "MarkDone":
      return "MarkDone";
    case "Insert":
      const res = payload.res;
      return res.term ? ppr(res) : ppb(res.bindings);
  }
}
