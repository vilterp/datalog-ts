import { EmissionLog, ppr, NodeID, Res } from "./types";
import { Program, Rec, Statement } from "../types";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { hasVars } from "../simpleEvaluate";
import { ppt } from "../pretty";
import { Loader } from "../loaders";
import { language as dlLanguage } from "../parser";
import {
  datalogOut,
  graphvizOut,
  jsonOut,
  plainTextOut,
  TestOutput,
} from "../util/ddTest/types";
import path from "path-browserify";
import { mapObj } from "../util";
import { RuleGraph } from "./ruleGraph";

type Output =
  | { type: "EmissionLog"; log: EmissionLog }
  | { type: "Trace"; logAndGraph: EmissionLogAndGraph }
  | { type: "Graphviz"; dot: string }
  | { type: "Json"; json: any }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

export type EmissionLogAndGraph = {
  graph: RuleGraph;
  log: EmissionLog;
};

const ack: Output = { type: "Acknowledge" };

export class Interpreter {
  loadStack: string[];
  graph: RuleGraph;
  loader: Loader;

  constructor(loader: Loader) {
    this.loadStack = [];
    this.graph = new RuleGraph();
    this.loader = loader;
  }

  queryStr(line: string): Res[] {
    const record = dlLanguage.record.tryParse(line) as Rec;
    return this.graph.doQuery(record);
  }

  evalStr(line: string) {
    const stmt = dlLanguage.statement.tryParse(line) as Statement;
    if (stmt.type !== "Insert") {
      throw new Error("not an insert");
    }
    return this.processStmt({ type: "Insert", record: stmt.record });
  }

  processStmt(stmt: Statement): Output {
    const graph = this.graph;
    switch (stmt.type) {
      case "TableDecl": {
        this.graph.declareTable(stmt.name);
        return ack;
      }
      case "Rule": {
        const emissionLog = this.graph.addRule(stmt.rule);
        return { type: "EmissionLog", log: emissionLog };
      }
      case "Insert": {
        if (hasVars(stmt.record)) {
          return {
            type: "QueryResults",
            results: this.graph.doQuery(stmt.record),
          };
        }
        const emissionLog = this.graph.insertFact(stmt.record);
        return { type: "EmissionLog", log: emissionLog };
      }
      case "RuleGraph":
        return { type: "Graphviz", dot: prettyPrintGraph(toGraphviz(graph)) };
      case "DumpCaches":
        return {
          type: "Json",
          json: mapObj(this.graph.nodes, (nodeID, node) => ({
            nodeID,
            cache: node.cache.toJSON(),
          })),
        };
      case "Comment":
        return ack;
      case "LoadStmt":
        this.doLoad(stmt.path);
        return ack;
      case "TraceStmt": {
        const emissionLog = this.graph.insertFact(stmt.record);
        return {
          type: "Trace",
          logAndGraph: {
            graph: this.graph,
            log: emissionLog,
          },
        };
      }
    }
  }

  doLoad(loadPath: string) {
    const currentDir =
      this.loadStack.length > 0
        ? path.dirname(this.loadStack[this.loadStack.length - 1])
        : ".";
    const pathToLoad = path.resolve(currentDir, loadPath);
    const contents = this.loader(pathToLoad);
    const program: Program = dlLanguage.program.tryParse(contents);
    this.loadStack.push(loadPath);
    // process program with new load stack
    for (let stmt of program) {
      this.processStmt(stmt);
    }
    this.loadStack.pop();
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
                `${fromID}: [${output.map((res) => `${ppr(res)}`).join(", ")}]`
            )
            .join("\n")
        );
      } else {
        return datalogOut(
          output.log
            .filter((emissionBatch) => {
              const fromNode = graph.nodes[emissionBatch.fromID];
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
    case "Json":
      return jsonOut(JSON.stringify(output.json, null, 2));
    case "QueryResults":
      return datalogOut(
        output.results
          .map((res) => `${opts.showBindings ? ppr(res) : ppt(res.term)}.`)
          .join("\n")
      );
    case "Trace":
      return {
        content: JSON.stringify(output.logAndGraph),
        mimeType: "incremental-datalog/trace",
      };
  }
}
