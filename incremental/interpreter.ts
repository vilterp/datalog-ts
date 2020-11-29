import { emptyRuleGraph, formatRes, Res, RuleGraph } from "./types";
import { Program, Rec, Statement } from "../types";
import { declareTable } from "./build";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { addRule, doQuery, EmissionBatch, insertFact } from "./eval";
import { hasVars } from "../simpleEvaluate";
import { ppt } from "../pretty";
import { Loader } from "../loaders";
import { language as dlLanguage } from "../parser";
import * as path from "path";

export type Interpreter = {
  loadStack: string[];
  graph: RuleGraph;
  loader: Loader;
};

type Output =
  | { type: "EmissionLog"; log: EmissionBatch[] }
  | { type: "Graphviz"; dot: string }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

const ack: Output = { type: "Acknowledge" };

export function newInterpreter(loader: Loader): Interpreter {
  return {
    loadStack: [],
    graph: emptyRuleGraph,
    loader,
  };
}

export function queryStr(interp: Interpreter, line: string): Res[] {
  const record = dlLanguage.record.tryParse(line) as Rec;
  return doQuery(interp.graph, record);
}

export function processStmt(
  interp: Interpreter,
  stmt: Statement
): { newInterp: Interpreter; output: Output } {
  const graph = interp.graph;
  switch (stmt.type) {
    case "TableDecl": {
      const newGraph = declareTable(graph, stmt.name);
      return { newInterp: { ...interp, graph: newGraph }, output: ack };
    }
    case "Rule": {
      const { newGraph, emissionLog } = addRule(graph, stmt.rule);
      return {
        newInterp: { ...interp, graph: newGraph },
        output: { type: "EmissionLog", log: emissionLog },
      };
    }
    case "Insert":
      if (hasVars(stmt.record)) {
        return {
          newInterp: interp,
          output: {
            type: "QueryResults",
            results: doQuery(graph, stmt.record),
          },
        };
      }
      const { newGraph, emissionLog } = insertFact(graph, stmt.record);
      return {
        newInterp: {
          ...interp,
          graph: newGraph,
        },
        output: { type: "EmissionLog", log: emissionLog },
      };
    case "RuleGraph":
      return {
        newInterp: interp,
        output: { type: "Graphviz", dot: prettyPrintGraph(toGraphviz(graph)) },
      };
    case "Comment":
      return {
        newInterp: interp,
        output: ack,
      };
    case "LoadStmt":
      return {
        newInterp: doLoad(interp, stmt.path),
        output: ack,
      };
    default:
      throw new Error(`unknown statement type: ${stmt.type}`);
  }
}

function doLoad(interp: Interpreter, loadPath: string): Interpreter {
  const currentDir =
    interp.loadStack.length > 0
      ? path.dirname(interp.loadStack[interp.loadStack.length - 1])
      : ".";
  const pathToLoad = path.resolve(currentDir, loadPath);
  const contents = interp.loader(pathToLoad);
  const program: Program = dlLanguage.program.tryParse(contents);
  const withNewStack = {
    ...interp,
    loadStack: [...interp.loadStack, loadPath],
  };
  // process program with new load stack
  const withLoaded = program.reduce<Interpreter>(
    (interp, stmt) => processStmt(interp, stmt).newInterp,
    withNewStack
  );
  // go back to original stack
  return {
    ...withLoaded,
    loadStack: interp.loadStack,
  };
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
