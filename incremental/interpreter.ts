import { formatRes, Res, RuleGraph } from "./types";
import { Statement } from "../types";
import { declareTable } from "./build";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { addRule, doQuery, EmissionBatch, insertFact } from "./eval";
import { hasVars } from "../simpleEvaluate";
import { ppt } from "../pretty";

type Output =
  | { type: "EmissionLog"; log: EmissionBatch[] }
  | { type: "Graphviz"; dot: string }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

const ack: Output = { type: "Acknowledge" };

export function processStmt(
  graph: RuleGraph,
  stmt: Statement
): { newGraph: RuleGraph; output: Output } {
  switch (stmt.type) {
    case "TableDecl": {
      const newGraph = declareTable(graph, stmt.name);
      return { newGraph, output: ack };
    }
    case "Rule": {
      const { newGraph, emissionLog } = addRule(graph, stmt.rule);
      return { newGraph, output: { type: "EmissionLog", log: emissionLog } };
    }
    case "Insert":
      if (hasVars(stmt.record)) {
        return {
          newGraph: graph,
          output: {
            type: "QueryResults",
            results: doQuery(graph, stmt.record),
          },
        };
      }
      const { newGraph, emissionLog } = insertFact(graph, stmt.record);
      return { newGraph, output: { type: "EmissionLog", log: emissionLog } };
    case "RuleGraph":
      return {
        newGraph: graph,
        output: { type: "Graphviz", dot: prettyPrintGraph(toGraphviz(graph)) },
      };
    case "Comment":
      return {
        newGraph: graph,
        output: ack,
      };
    default:
      throw new Error(`unknown statement type: ${stmt.type}`);
  }
}

type OutputOptions = {
  emissionLogMode: "test" | "repl";
  showBindings: boolean;
};

export function formatOutput(
  graph: RuleGraph,
  output: Output,
  opts: OutputOptions
): string {
  switch (output.type) {
    case "Acknowledge":
      return "";
    case "EmissionLog":
      if (opts.emissionLogMode === "test") {
        return output.log
          .map(
            ({ fromID, output }) =>
              `${fromID}: [${output
                .map((res) => `${formatRes(res)}`)
                .join(", ")}]`
          )
          .join("\n");
      } else {
        return output.log
          .filter((emissionBatch) => {
            const fromNode = graph.nodes[emissionBatch.fromID];
            return (
              !fromNode.isInternal && fromNode.desc.type !== "BaseFactTable"
            );
          })
          .map(({ output }) =>
            output.map((res) => `${ppt(res.term)}.`).join("\n")
          )
          .join("\n");
      }
    case "Graphviz":
      // TODO: return a 'mime type' with this so downstream systems
      //   know what to do with it...
      return output.dot;
    case "QueryResults":
      return output.results
        .map((res) => `${opts.showBindings ? formatRes(res) : ppt(res.term)}.`)
        .join("\n");
  }
}
