import { EmissionLogAndGraph, emptyRuleGraph, RuleGraph } from "./types";
import { Rec, Res, Rule, Statement } from "../types";
import { declareTable } from "./build";
import { addRule, doQuery, EmissionLog, insertFact } from "./eval";
import { hasVars } from "../simple/simpleEvaluate";
import { ppr, ppt } from "../pretty";
import { Loader } from "../loaders";
import { language as dlLanguage } from "../parser";
import { datalogOut, plainTextOut, TestOutput } from "../../util/ddTest/types";
import { AbstractInterpreter } from "../abstractInterpreter";

export type Output =
  | { type: "EmissionLog"; log: EmissionLog }
  | { type: "Trace"; logAndGraph: EmissionLogAndGraph }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

export class IncrementalInterpreter extends AbstractInterpreter {
  graph: RuleGraph;
  rules: Rule[];
  tables: string[];

  // TODO: kind of don't want to expose the graph parameter on the public
  //   constructor, but there's no constructor overloading...
  constructor(cwd: string, loader: Loader, graph: RuleGraph = emptyRuleGraph) {
    super(cwd, loader);
    this.graph = graph;
  }

  evalStmt(stmt: Statement): [Res[], AbstractInterpreter] {
    const { output, newInterp } = this.processStmt(stmt);
    return [output.type === "QueryResults" ? output.results : [], newInterp];
  }

  processStmt(stmt: Statement): {
    newInterp: AbstractInterpreter;
    output: Output;
  } {
    const interp = this;
    const graph = interp.graph;
    switch (stmt.type) {
      case "TableDecl": {
        const newGraph = declareTable(graph, stmt.name);
        return {
          newInterp: new IncrementalInterpreter(
            this.cwd,
            this.loader,
            newGraph
          ),
          output: ack,
        };
      }
      case "Rule": {
        const { newGraph, emissionLog } = addRule(graph, stmt.rule);
        return {
          newInterp: new IncrementalInterpreter(
            this.cwd,
            this.loader,
            newGraph
          ),
          output: { type: "EmissionLog", log: emissionLog },
        };
      }
      case "Query":
        return {
          newInterp: interp,
          output: {
            type: "QueryResults",
            results: doQuery(graph, stmt.record),
          },
        };
      case "Insert": {
        // TODO: don't do this in insert?
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
          newInterp: new IncrementalInterpreter(
            this.cwd,
            this.loader,
            newGraph
          ),
          output: { type: "EmissionLog", log: emissionLog },
        };
      }
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

  getRules(): Rule[] {
    return this.graph.rules;
  }

  getTables(): string[] {
    return this.graph.tables;
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
      return datalogOut("");
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
