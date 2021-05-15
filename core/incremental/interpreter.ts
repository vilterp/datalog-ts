import {
  EmissionLogAndGraph,
  emptyRuleGraph,
  formatRes,
  RuleGraph,
} from "./types";
import { Rec, Res, Statement } from "../types";
import { declareTable } from "./build";
import { addRule, doQuery, EmissionLog, insertFact } from "./eval";
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
} from "../../util/ddTest/types";
import { AbstractInterpreter } from "../abstractInterpreter";

type Output =
  | { type: "EmissionLog"; log: EmissionLog }
  | { type: "Trace"; logAndGraph: EmissionLogAndGraph }
  | { type: "Graphviz"; dot: string }
  | { type: "Json"; json: any }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

export class IncrementalInterpreter extends AbstractInterpreter {
  graph: RuleGraph;

  constructor(cwd: string, loader: Loader) {
    super(cwd, loader);
    this.loadStack = [];
    this.graph = emptyRuleGraph;
    this.loader = loader;
  }

  evalStmt(stmt: Statement): [Res[], AbstractInterpreter] {
    const { output, newInterp } = this.processStmt(stmt);
    return [output.type === "QueryResults" ? output.results : [], newInterp];
  }

  private processStmt(
    stmt: Statement
  ): { newInterp: AbstractInterpreter; output: Output } {
    const interp = this;
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
      // case "RuleGraph":
      //   return {
      //     newInterp: interp,
      //     output: { type: "Graphviz", dot: prettyPrintGraph(toGraphviz(graph)) },
      //   };
      // case "DumpCaches":
      //   return {
      //     newInterp: interp,
      //     output: {
      //       type: "Json",
      //       json: interp.graph.nodes.map((node, nodeID) => ({
      //         nodeID,
      //         cache: node.cache.toJSON(),
      //       })),
      //     },
      //   };
      case "Comment":
        return {
          newInterp: interp,
          output: ack,
        };
      case "LoadStmt":
        return {
          newInterp: this.doLoad(stmt.path),
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

  queryStr(str: string): Res[] {
    const record = dlLanguage.record.tryParse(str) as Rec;
    return doQuery(this.graph, record);
  }
}

const ack: Output = { type: "Acknowledge" };

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
    case "Json":
      return jsonOut(JSON.stringify(output.json, null, 2));
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
