import {
  EmissionLogAndGraph,
  emptyRuleGraph,
  formatRes,
  Res,
  RuleGraph,
} from "./types";
import { Program, Rec, Statement } from "../types";
import { declareTable } from "./build";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import {
  addRule,
  doQuery,
  EmissionBatch,
  EmissionLog,
  insertFact,
} from "./eval";
import { hasVars } from "../simpleEvaluate";
import { ppt } from "../pretty";
import { Loader } from "../loaders";
import { language as dlLanguage } from "../parser";
import {
  datalogOut,
  graphvizOut,
  plainTextOut,
  TestOutput,
} from "../util/ddTest/types";

export type Interpreter = {
  graph: RuleGraph;
  loader: Loader;
};

type Output =
  | { type: "EmissionLog"; log: EmissionLog }
  | { type: "Trace"; logAndGraph: EmissionLogAndGraph }
  | { type: "Graphviz"; dot: string }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

const ack: Output = { type: "Acknowledge" };

// TODO: make back into a class

export function newInterpreter(loader: Loader): Interpreter {
  return {
    graph: emptyRuleGraph,
    loader,
  };
}

export function queryStr(interp: Interpreter, line: string): Res[] {
  const record = dlLanguage.record.tryParse(line) as Rec;
  return doQuery(interp.graph, record);
}

export function evalStr(interp: Interpreter, line: string): Interpreter {
  const stmt = dlLanguage.statement.tryParse(line) as Statement;
  if (stmt.type !== "Insert") {
    throw new Error("not an insert");
  }
  return processStmt(interp, { type: "Insert", record: stmt.record }).newInterp;
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
    case "Insert": {
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
    }
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
    case "TraceStmt": {
      const { newGraph, emissionLog } = insertFact(graph, stmt.record);
      return {
        newInterp: {
          ...interp,
          graph: newGraph,
        },
        output: {
          type: "Trace",
          logAndGraph: {
            graph: newGraph,
            log: emissionLog,
          },
        },
      };
    }
  }
}

export function doLoad(interp: Interpreter, loadPath: string): Interpreter {
  const contents = interp.loader(loadPath);
  const program: Program = dlLanguage.program.tryParse(contents);
  // process program with new load stack
  return program.reduce<Interpreter>(
    (interp, stmt) => processStmt(interp, stmt).newInterp,
    interp
  );
}

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
      return plainTextOut("");
    case "EmissionLog":
      if (opts.emissionLogMode === "test") {
        return plainTextOut(
          output.log
            .map(
              ({ fromID, output }) =>
                `${fromID}: [${output
                  .map((res) => `${formatRes(res)}`)
                  .join(", ")}]`
            )
            .join("\n")
        );
      } else {
        return datalogOut(
          output.log
            .filter((emissionBatch) => {
              const fromNode = graph.nodes.get(emissionBatch.fromID);
              return (
                !fromNode.isInternal && fromNode.desc.type !== "BaseFactTable"
              );
            })
            .map(({ output }) =>
              output.map((res) => `${ppt(res.term)}.`).join("\n")
            )
            .join("\n")
        );
      }
    case "Graphviz":
      return graphvizOut(output.dot);
    case "QueryResults":
      return datalogOut(
        output.results
          .map(
            (res) => `${opts.showBindings ? formatRes(res) : ppt(res.term)}.`
          )
          .join("\n")
      );
    case "Trace":
      return {
        content: JSON.stringify(output.logAndGraph),
        mimeType: "incremental-datalog/trace",
      };
  }
}
