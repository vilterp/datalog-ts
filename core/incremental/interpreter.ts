import { EmissionLogAndGraph, emptyRuleGraph, RuleGraph } from "./types";
import { Rec, Res, Rule, Statement } from "../types";
import { doQuery, EmissionLog, insertFact } from "./eval";
import { hasVars } from "../simple/simpleEvaluate";
import { ppb, ppr, ppt } from "../pretty";
import { Loader } from "../loaders";
import {
  datalogOut,
  datalogOutResults,
  plainTextOut,
  TestOutput,
} from "../../util/ddTest/types";
import { AbstractInterpreter } from "../abstractInterpreter";
import { parseRecord } from "../../languageWorkbench/languages/dl/parser";
import { parserTermToInternal } from "../translateAST";
import { flatMap } from "../../util/util";
import {
  addFact,
  addRule,
  Catalog,
  declareTable,
  emptyCatalog,
} from "./catalog";

export type Output =
  | { type: "EmissionLog"; log: EmissionLog }
  | { type: "Trace"; logAndGraph: EmissionLogAndGraph }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

export class IncrementalInterpreter extends AbstractInterpreter {
  graph: RuleGraph | null; // null: invalid; needs to be recomputed
  catalog: Catalog;

  // TODO: kind of don't want to expose the graph parameter on the public
  //   constructor, but there's no constructor overloading...
  constructor(
    cwd: string,
    loader: Loader,
    catalog: Catalog = emptyCatalog,
    graph: RuleGraph = emptyRuleGraph
  ) {
    super(cwd, loader);
    this.graph = graph;
    this.catalog = catalog;
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
    switch (stmt.type) {
      case "TableDecl": {
        const newCatalog = declareTable(interp.catalog, stmt.name);
        const newInterp = new IncrementalInterpreter(
          this.cwd,
          this.loader,
          newCatalog,
          null
        );
        return {
          newInterp,
          output: ack,
        };
      }
      case "Rule": {
        // TODO: maybe adding a rule should immediately compute that rule
        const newCatalog = addRule(interp.catalog, stmt.rule);
        return {
          newInterp: new IncrementalInterpreter(
            this.cwd,
            this.loader,
            newCatalog,
            null
          ),
          output: ack,
        };
      }
      case "Fact": {
        const { newGraph, emissionLog } = insertFact(interp.graph, {
          term: stmt.record,
          trace: { type: "BaseFactTrace" },
          bindings: {},
        });
        const newCatalog = addFact(interp.catalog, stmt.record);
        return {
          newInterp: new IncrementalInterpreter(
            this.cwd,
            this.loader,
            newCatalog,
            newGraph
          ),
          output: { type: "EmissionLog", log: emissionLog },
        };
      }
      case "Query": {
        let newInterp: IncrementalInterpreter = interp;
        if (interp.graph === null) {
          newInterp = new IncrementalInterpreter(
            this.cwd,
            this.loader,
            this.catalog,
            buildGraph(this.catalog)
          );
        }
        return {
          newInterp,
          output: {
            type: "QueryResults",
            results: doQuery(newInterp.graph, stmt.record),
          },
        };
      }
      case "LoadStmt":
        return {
          newInterp: this.doLoad(stmt.path),
          output: ack,
        };
    }
  }

  // TODO: shouldn't this be in AbstractInterpreter?
  queryStr(str: string): Res[] {
    const rawRecord = parseRecord(str);
    const record = parserTermToInternal(rawRecord) as Rec;
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
