import { RuleGraph } from "./types";
import { Statement } from "../types";
import { addRule, declareTable } from "./build";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { EmissionBatch, insertFact } from "./eval";

export function processStmt(
  graph: RuleGraph,
  stmt: Statement
): { newGraph: RuleGraph; emissionLog: EmissionBatch[]; otherOutput?: string } {
  console.log(stmt);
  switch (stmt.type) {
    case "TableDecl": {
      const newGraph = declareTable(graph, stmt.name);
      return { newGraph, emissionLog: [] };
    }
    case "Rule": {
      const newGraph = addRule(graph, stmt.rule);
      return { newGraph, emissionLog: [] };
    }
    case "Insert":
      return insertFact(graph, stmt.record);
    case "RuleGraph":
      return {
        newGraph: graph,
        emissionLog: [],
        otherOutput: prettyPrintGraph(toGraphviz(graph)),
      };
    default:
      throw new Error(`unknown statement type: ${stmt.type}`);
  }
}
