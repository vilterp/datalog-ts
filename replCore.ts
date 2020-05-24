import { DB, Program, Rec, Res, Statement } from "./types";
import { Loader } from "./repl";
import { language as dlLanguage } from "./parser";
import { evaluate, hasVars } from "./simpleEvaluate";

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

  evalStr(line: string): Res[] {
    const stmt = dlLanguage.statement.tryParse(line);
    return this.evalStmt(stmt);
  }

  evalStmt(stmt: Statement): Res[] {
    switch (stmt.type) {
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          return this.evalQuery(record);
        }
        let tbl = this.db.tables[record.relation];
        if (!tbl) {
          tbl = [];
          this.db.tables[record.relation] = tbl;
        }
        tbl.push(record);
        return [];
      }
      case "Rule": {
        const rule = stmt.rule;
        this.db.rules[rule.head.relation] = rule;
        return [];
      }
      case "TableDecl":
        if (this.db.tables[stmt.name]) {
          return [];
        }
        this.db.tables[stmt.name] = [];
        return [];
      case "LoadStmt":
        this.doLoad(stmt.path);
        return [];
      default:
        return [];
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
