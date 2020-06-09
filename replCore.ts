import { DB, Program, Rec, Res, Statement } from "./types";
import { Loader } from "./repl";
import { language as dlLanguage } from "./parser";
import { evaluate, hasVars } from "./simpleEvaluate";

export type StmtResult = { results: Res[]; trace: boolean };

export class ReplCore {
  db: DB;
  loader: Loader;

  constructor(loader: Loader) {
    this.db = {
      tables: {},
      rules: {},
    };
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
    const contents = this.loader(path);
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
