import { PropagationLog, Res } from "./types";
import { Program, Rec, Statement } from "../types";
import { prettyPrintGraph } from "../util/graphviz";
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
import { mapObj } from "../util/util";
import { RuleGraph } from "./ruleGraph";
import { formatNodeDesc, formatNodeWithIndexes, ppr } from "./pretty";

export type Output =
  | { type: "PropagationLog"; log: PropagationLog }
  | { type: "Trace"; logAndGraph: PropagationLogAndGraph }
  | { type: "Graphviz"; dot: string }
  | { type: "Json"; json: any }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

export type PropagationLogAndGraph = {
  graph: RuleGraph;
  log: PropagationLog;
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
    return this.processStmt(stmt);
  }

  processStmt(stmt: Statement): Output {
    const graph = this.graph;
    switch (stmt.type) {
      case "TableDecl": {
        this.graph.declareTable(stmt.name);
        return ack;
      }
      case "Rule": {
        const PropagationLog = this.graph.addRule(stmt.rule);
        return { type: "PropagationLog", log: PropagationLog };
      }
      case "Insert": {
        if (hasVars(stmt.record)) {
          return {
            type: "QueryResults",
            results: this.graph.doQuery(stmt.record),
          };
        }
        const PropagationLog = this.graph.insertFact(stmt.record);
        return { type: "PropagationLog", log: PropagationLog };
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
        const PropagationLog = this.graph.insertFact(stmt.record);
        return {
          type: "Trace",
          logAndGraph: {
            graph: this.graph,
            log: PropagationLog,
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
  propagationLogMode: "test" | "repl";
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
    case "PropagationLog":
      if (opts.propagationLogMode === "test") {
        return {
          content: output.log
            .map((batch) => {
              return [
                `${batch.insertion.destination} from ${
                  batch.insertion.origin
                }: ${ppr(batch.insertion.res)}. ${formatNodeDesc(
                  graph.nodes[batch.insertion.destination].desc
                )}`,
                ...batch.output.map((res) => `  ${ppr(res)}`),
              ].join("\n");
            })
            .join("\n"),
          mimeType: "text/propagation-log",
        };
      } else {
        return datalogOut(
          output.log
            .filter((PropagationStep) => {
              const fromNode =
                graph.nodes[PropagationStep.insertion.destination];
              return (
                !fromNode.isInternal && fromNode.desc.type !== "BaseFactTable"
              );
            })
            .map(({ output }) => output.map((res) => `${ppr(res)}.`).join("\n"))
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
