import {
  datalogOut,
  datalogOutResults,
  TestOutput,
} from "../../util/ddTest/types";
import { flatMap } from "../../util/util";
import { ppb, ppr } from "../pretty";
import { Output, RuleGraph } from "./types";

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
                `${fromID}: [${output
                  .map((res) => (res.term ? ppr(res) : ppb(res.bindings)))
                  .join(", ")}]`
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
            ({ output }) => output.map((res) => res.term)
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
