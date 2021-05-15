import {
  DB,
  Program,
  Rec,
  Res,
  Statement,
  rec,
  str,
  Term,
  Rule,
} from "../types";
import { language as dlLanguage } from "../parser";
import { evaluate, hasVars } from "./simpleEvaluate";
import { Loader } from "../loaders";
import { mapObjToList, flatMapObjToList, flatMap } from "../../util/util";
import { AbstractInterpreter } from "../abstractInterpreter";

const initialDB: DB = {
  tables: {},
  rules: {},
  virtualTables: {
    "internal.Relation": virtualRelations,
    "internal.RelationReference": virtualReferences,
  },
};

export class SimpleInterpreter extends AbstractInterpreter {
  db: DB;

  constructor(cwd: string, loader: Loader, db: DB = initialDB) {
    super(cwd, loader);
    this.db = db;
    this.cwd = cwd;
    this.loader = loader;
  }

  evalStmt(stmt: Statement): [Res[], AbstractInterpreter] {
    switch (stmt.type) {
      case "Query":
        return [this.evalQuery(stmt.record), this];
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          // TODO: separate method for querying?
          return [this.evalQuery(record), this];
        }
        let tbl = this.db.tables[record.relation] || [];
        return [
          [],
          this.withDB({
            ...this.db,
            tables: {
              ...this.db.tables,
              [record.relation]: [...tbl, record],
            },
          }),
        ];
      }
      case "Rule": {
        const rule = stmt.rule;
        return [
          [],
          this.withDB({
            ...this.db,
            rules: {
              ...this.db.rules,
              [rule.head.relation]: rule,
            },
          }),
        ];
      }
      case "TableDecl":
        if (this.db.tables[stmt.name]) {
          return [[], this];
        }
        return [
          [],
          this.withDB({
            ...this.db,
            tables: {
              ...this.db.tables,
              [stmt.name]: [],
            },
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
    return Object.values(this.db.rules);
  }

  getTables(): string[] {
    return Object.keys(this.db.tables);
  }
}

function virtualRelations(db: DB): Rec[] {
  return [
    ...mapObjToList(db.rules, (name) =>
      rec("internal.Relation", { type: str("rule"), name: str(name) })
    ),
    ...mapObjToList(db.tables, (name) =>
      rec("internal.Relation", { type: str("table"), name: str(name) })
    ),
    ...mapObjToList(db.virtualTables, (name) =>
      rec("internal.Relation", { type: str("virtual"), name: str(name) })
    ),
  ];
}

function virtualReferences(db: DB): Rec[] {
  return flatMapObjToList(db.rules, (ruleName, rule) =>
    flatMap(rule.defn.opts, (opt) =>
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
