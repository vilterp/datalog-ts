import {
  ack,
  EmissionLogAndGraph,
  emptyRuleGraph,
  Output,
  RuleGraph,
} from "./types";
import { baseFactTrace, Res, Rule, Statement } from "../types";
import { doQuery, EmissionLog, insertFact } from "./eval";
import { ppb, ppr } from "../pretty";
import { Loader } from "../loaders";
import {
  datalogOut,
  datalogOutResults,
  TestOutput,
} from "../../util/ddTest/types";
import { AbstractInterpreter } from "../abstractInterpreter";
import { filterMap, flatMap } from "../../util/util";
import {
  addFact,
  addRule,
  Catalog,
  declareTable,
  emptyCatalog,
} from "./catalog";
import { buildGraph } from "./build";

export class IncrementalInterpreter extends AbstractInterpreter {
  graph: RuleGraph | null;
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
        let newGraph = this.graph;
        if (this.graph !== null) {
          const res = insertFact(interp.graph, {
            term: stmt.record,
            trace: { type: "BaseFactTrace" },
            bindings: {},
          });
          newGraph = res.newGraph;
        }
        const newCatalog = addFact(interp.catalog, stmt.record);
        return {
          newInterp: new IncrementalInterpreter(
            this.cwd,
            this.loader,
            newCatalog,
            newGraph
          ),
          output: ack,
        };
      }
      case "Query": {
        let newInterp: IncrementalInterpreter = interp;
        if (interp.graph === null) {
          newInterp = new IncrementalInterpreter(
            this.cwd,
            this.loader,
            this.catalog,
            replayFacts(buildGraph(this.catalog), this.catalog)
          );
        }
        console.log("graph", {
          nodes: newInterp.graph.nodes.toJSON(),
          edges: newInterp.graph.edges.toJSON(),
        });
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

  getRules(): Rule[] {
    return filterMap(Object.entries(this.catalog), ([key, val]) =>
      val.type === "Rule" ? val.rule : null
    );
  }

  getTables(): string[] {
    return filterMap(Object.entries(this.catalog), ([key, val]) =>
      val.type === "Table" ? key : null
    );
  }
}

function replayFacts(ruleGraph: RuleGraph, catalog: Catalog): RuleGraph {
  return Object.entries(catalog).reduce((accum, [relName, rel]) => {
    if (rel.type === "Rule") {
      return accum;
    }
    return rel.records.reduce(
      (accum2, rec) =>
        insertFact(accum2, { term: rec, bindings: {}, trace: baseFactTrace })
          .newGraph,
      accum
    );
  }, ruleGraph);
}
