import { Map, List } from "immutable";
import { Rec, Res, rec, str, Rule, UserError } from "../types";
import { evaluate, hasVars } from "./simpleEvaluate";
import { Loader } from "../loaders";
import { mapObjToList, flatMapObjToList, flatMap } from "../../util/util";
import { AbstractInterpreter } from "../abstractInterpreter";
import {
  emptyLazyIndexedCollection,
  LazyIndexedCollection,
  lazyIndexedCollectionFromList,
} from "./lazyIndexedCollection";
import { DB, emptyDB } from "./types";
import { DLStatement } from "../../languageWorkbench/languages/dl/parser";

export class SimpleInterpreter extends AbstractInterpreter {
  db: DB;

  constructor(cwd: string, loader: Loader, db: DB = emptyDB) {
    super(cwd, loader);
    this.db = db;
    this.cwd = cwd;
    this.loader = loader;
  }

  evalStmt(stmt: DLStatement): [Res[], AbstractInterpreter] {
    switch (stmt.type) {
      case "Query":
        return [this.evalQuery(stmt.record), this];
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          // TODO: separate method for querying?
          return [this.evalQuery(record), this];
        }
        return [
          [],
          this.withDB({
            ...this.db,
            tables: this.db.tables.update(
              record.relation,
              (tbl = emptyLazyIndexedCollection()) => tbl.insert(record)
            ),
          }),
        ];
      }
      case "Delete": {
        return [
          [],
          this.withDB({
            ...this.db,
            tables: this.db.tables.update(stmt.record.relation, (tbl) =>
              tbl.delete(stmt.record)
            ),
          }),
        ];
      }
      case "Rule": {
        const rule = stmt.rule;
        // TODO: move this to some kind of validation phase?
        // better than silent failure tho.
        if (this.db.rules.get(rule.head.relation)) {
          throw new UserError(`rule "${rule.head.relation}" already defined`);
        }
        return [
          [],
          this.withDB({
            ...this.db,
            rules: this.db.rules.set(rule.head.relation, rule),
          }),
        ];
      }
      case "TableDecl":
        return [
          [],
          this.withDB({
            ...this.db,
            tables: this.db.tables.update(
              stmt.name,
              (x = emptyLazyIndexedCollection()) => x // leave it alone if it's there
            ),
          }),
        ];
      case "LoadStmt":
        return [[], this.doLoad(stmt.path)];
      case "Comment":
        return [[], this];
    }
  }

  private evalQuery(record: Rec): Res[] {
    return evaluate(this.db, record);
  }

  private withDB(db: DB) {
    return new SimpleInterpreter(this.cwd, this.loader, db);
  }

  getRules(): Rule[] {
    return this.db.rules.valueSeq().toArray();
  }

  getTables(): string[] {
    return [
      ...this.db.tables.keySeq().toArray(),
      ...this.db.virtualTables.keySeq().toArray(),
    ];
  }

  // caveats: throws away all the indices.
  // most efficient when starting from an empty DB.
  bulkInsert(records: Rec[]): SimpleInterpreter {
    const tables = this.db.tables
      .mapEntries(([name, table]) => [name, table.all().toArray()])
      .toJSON();
    for (const record of records) {
      // is there a better pattern for this?
      const table = tables[record.relation] || [];
      table.push(record);
      tables[record.relation] = table;
    }
    const newTables = Map(tables).mapEntries(([name, records]) => [
      name,
      lazyIndexedCollectionFromList(records),
    ]);
    return this.withDB({ ...this.db, tables: newTables });
  }
}

function virtualRelations(db: DB): Rec[] {
  return [
    ...mapObjToList(db.rules.toJSON(), (name) =>
      rec("internal.Relation", { type: str("rule"), name: str(name) })
    ),
    ...mapObjToList(db.tables.toJSON(), (name) =>
      rec("internal.Relation", { type: str("table"), name: str(name) })
    ),
    ...mapObjToList(db.virtualTables.toJSON(), (name) =>
      rec("internal.Relation", { type: str("virtual"), name: str(name) })
    ),
  ];
}

function virtualReferences(db: DB): Rec[] {
  return flatMapObjToList(db.rules.toJSON(), (ruleName, rule) =>
    flatMap(rule.body.opts, (opt) =>
      flatMap(opt.clauses, (clause) =>
        clause.type === "Record"
          ? [
              rec("internal.RelationReference", {
                from: str(ruleName),
                to: str(clause.relation),
              }),
            ]
          : []
      )
    )
  );
}
