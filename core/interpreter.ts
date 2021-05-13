import { DB, Program, Rec, Res, Statement, rec, str, Term } from "./types";
import { language as dlLanguage } from "./parser";
import { evaluate, hasVars } from "./simpleEvaluate";
import { Loader } from "./loaders";
import { mapObjToList, flatMapObjToList, flatMap } from "../util/util";

export type StmtResult = { results: Res[]; trace: boolean };

const initialDB: DB = {
  tables: {},
  rules: {},
  virtualTables: {
    "internal.Relation": virtualRelations,
    "internal.RelationReference": virtualReferences,
  },
};

export class Interpreter {
  db: DB;
  cwd: string;
  loader: Loader;

  constructor(cwd: string, loader: Loader, db: DB = initialDB) {
    this.db = db;
    this.cwd = cwd;
    this.loader = loader;
  }

  queryStr(line: string): StmtResult {
    const record = dlLanguage.record.tryParse(line) as Rec;
    const [res, _] = this.evalStmt({ type: "Insert", record });
    return res;
  }

  evalStr(line: string): [StmtResult, Interpreter] {
    const stmt = dlLanguage.statement.tryParse(line);
    return this.evalStmt(stmt);
  }

  evalStmt(stmt: Statement): [StmtResult, Interpreter] {
    switch (stmt.type) {
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          // TODO: separate method for querying?
          return [noTrace(this.evalQuery(record)), this];
        }
        let tbl = this.db.tables[record.relation] || [];
        return [
          noTrace([]),
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
          noTrace([]),
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
          return [noTrace([]), this];
        }
        return [
          noTrace([]),
          this.withDB({
            ...this.db,
            tables: {
              ...this.db.tables,
              [stmt.name]: [],
            },
          }),
        ];
      case "LoadStmt":
        return [noTrace([]), this.doLoad(stmt.path)];
      case "TraceStmt":
        const [res, interp] = this.evalStmt({
          type: "Insert",
          record: stmt.record,
        });
        return [yesTrace(res.results), interp];
      case "Comment":
        return [noTrace([]), this];
    }
  }

  private evalQuery(record: Rec): Res[] {
    return evaluate(this.db, record);
  }

  private withDB(db: DB) {
    return new Interpreter(this.cwd, this.loader, db);
  }

  doLoad(path: string): Interpreter {
    const contents = this.loader(this.cwd + "/" + path);
    const program: Program = dlLanguage.program.tryParse(contents);
    return program.reduce<Interpreter>(
      (interp, stmt) => interp.evalStmt(stmt)[1],
      this
    );
  }
}

function noTrace(results: Res[]): StmtResult {
  return { results, trace: false };
}

function yesTrace(results: Res[]): StmtResult {
  return { results, trace: true };
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
