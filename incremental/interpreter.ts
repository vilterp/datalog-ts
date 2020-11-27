import { formatRes, Res, RuleGraph } from "./types";
import { Statement } from "../types";
import { addRule, declareTable } from "./build";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { doQuery, EmissionBatch, insertFact } from "./eval";
import { hasVars } from "../simpleEvaluate";
import { ppr } from "../pretty";

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
      const newGraph = addRule(graph, stmt.rule);
      return { newGraph, output: ack };
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
    default:
      throw new Error(`unknown statement type: ${stmt.type}`);
  }
}

type OutputOptions = {
  showInternalEmissions: boolean;
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
      const fullLog = output.log.filter((emissionBatch) => {
        const fromNode = graph.nodes[emissionBatch.fromID];
        if (fromNode.desc.type === "BaseFactTable") {
          return false;
        }
        if (!fromNode.isInternal) {
          return true;
        }
        return opts.showInternalEmissions;
      });
      return fullLog
        .map(
          ({ fromID, output }) =>
            `${fromID}: [${output.map(formatRes).join(", ")}]`
        )
        .join("\n");
    case "Graphviz":
      // TODO: return a 'mime type' with this so downstream systems
      //   know what to do with it...
      return output.dot;
    case "QueryResults":
      return output.results.map(ppr).join("\n");
  }
}
