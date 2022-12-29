import { ack, emptyRuleGraph, Output, RuleGraph } from "./types";
import { Res, Rule, Statement } from "../types";
import { doQuery, insertOrRetractFact, replayFacts } from "./eval";
import { Loader } from "../loaders";
import { AbstractInterpreter } from "../abstractInterpreter";
import {
  addFact,
  addRule,
  Catalog,
  declareTable,
  emptyCatalog,
  removeFact,
  RuleEntry,
} from "./catalog";
import { buildGraph } from "./build";
import { formatMessagePayload } from "./output";

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
        const existing = interp.catalog.get(stmt.name);
        if (existing) {
          if (existing.type === "Table") {
            return { newInterp: this, output: ack };
          }
          throw new Error(
            `can't declare table ${stmt.name}: already a rule with that name`
          );
        }
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
        let newCatalog = this.catalog;
        let newGraph = this.graph;
        const tableName = stmt.record.relation;
        if (!this.catalog.has(tableName)) {
          // create table if it doesn't exist
          newCatalog = declareTable(newCatalog, tableName);
          newGraph = replayFacts(buildGraph(newCatalog), newCatalog);
        } else if (newGraph === null) {
          // rebuild graph if it was invalidated otherwise
          newGraph = replayFacts(buildGraph(newCatalog), newCatalog);
        }
        // add the new fact
        newCatalog = addFact(this.catalog, stmt.record);
        const res = insertOrRetractFact(newGraph, stmt.record, 1);
        // console.log("========");
        // res.emissionLog.forEach((entry) => {
        //   console.log(
        //     entry.fromID,
        //     entry.output.map((payload) => formatMessagePayload(payload))
        //   );
        // });
        return {
          newInterp: new IncrementalInterpreter(
            this.cwd,
            this.loader,
            newCatalog,
            res.newGraph
          ),
          output: { type: "EmissionLog", log: res.emissionLog },
        };
      }
      case "Delete": {
        const newCatalog = removeFact(this.catalog, stmt.record);
        const newGraph = insertOrRetractFact(
          this.graph,
          stmt.record,
          -1
        ).newGraph;
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
        // TODO: output emission log here too
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
    return this.catalog
      .valueSeq()
      .filter((e) => e.type === "Rule")
      .map((val) => (val as RuleEntry).rule)
      .toArray();
  }

  getTables(): string[] {
    return this.catalog
      .filter((e) => e.type === "Table")
      .keySeq()
      .toArray();
  }
}
