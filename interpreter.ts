import { DB, Program, Rec, Res, Statement, rec, str, Term } from "./types";
import { language as dlLanguage } from "./parser";
import { evaluate, hasVars } from "./simpleEvaluate";
import { Loader } from "./loaders";
import { mapObjToList, flatMapObjToList, flatMap } from "./util";

export type StmtResult = { results: Res[]; trace: boolean };

export class Interpreter {
  db: DB;
  cwd: string;
  loader: Loader;

  constructor(cwd: string, loader: Loader) {
    this.db = {
      tables: {},
      rules: {},
      virtualTables: {
        "internal.Relation": virtualRelations,
        "internal.RelationReference": virtualReferences,
      },
    };
    this.cwd = cwd;
    this.loader = loader;
  }

  evalStr(line: string): StmtResult {
    const stmt = dlLanguage.statement.tryParse(line);
    return this.evalStmt(stmt);
  }

  evalStmt(stmt: Statement): StmtResult {
    switch (stmt.type) {
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          return noTrace(this.evalQuery(record));
        }
        let tbl = this.db.tables[record.relation];
        if (!tbl) {
          tbl = [];
          this.db.tables[record.relation] = tbl;
        }
        tbl.push(record);
        return noTrace([]);
      }
      case "Rule": {
        const rule = stmt.rule;
        this.db.rules[rule.head.relation] = rule;
        return noTrace([]);
      }
      case "TableDecl":
        if (this.db.tables[stmt.name]) {
          return noTrace([]);
        }
        this.db.tables[stmt.name] = [];
        return noTrace([]);
      case "LoadStmt":
        this.doLoad(stmt.path);
        return noTrace([]);
      case "TraceStmt":
        const inner = this.evalStmt({ type: "Insert", record: stmt.record });
        return yesTrace(inner.results);
      case "Comment":
        return noTrace([]);
    }
  }

  private evalQuery(record: Rec): Res[] {
    return evaluate(this.db, record);
  }

  doLoad(path: string) {
    const contents = this.loader(this.cwd + "/" + path);
    const program: Program = dlLanguage.program.tryParse(contents);
    for (const stmt of program) {
      this.evalStmt(stmt);
    }
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
