import { Rec, Relation, Res, Rule, Statement } from "./types";
import { Loader } from "./loaders";
import {
  DLMain,
  DLStatement,
  parseMain,
  parseRecord,
} from "../languageWorkbench/languages/dl/parser";
import {
  parserStatementToInternal,
  parserTermToInternal,
} from "./translateAST";
import { ParseErrors } from "../languageWorkbench/parserlib/types";

export abstract class AbstractInterpreter {
  loadStack: string[];
  loader: Loader;
  cwd: string;

  protected constructor(cwd: string, loader: Loader) {
    this.loadStack = []; // TODO: use
    this.loader = loader;
    this.cwd = cwd;
  }

  abstract evalStmt(stmt: Statement): [Res[], AbstractInterpreter];

  // default impl that isn't bulk
  bulkInsert(records: Rec[]): AbstractInterpreter {
    let interp: AbstractInterpreter = this;
    for (const record of records) {
      interp = interp.evalStmt({ type: "Fact", record })[1];
    }
    return interp;
  }

  evalStmts(stmts: DLStatement[]): [Res[], AbstractInterpreter] {
    const rawStmts = stmts.map(parserStatementToInternal);
    return this.evalRawStmts(rawStmts);
  }

  evalRawStmts(stmts: Statement[]): [Res[], AbstractInterpreter] {
    const results: Res[] = [];
    let interp: AbstractInterpreter = this;
    stmts.forEach((stmt) => {
      const [newResults, newInterp] = interp.evalStmt(stmt);
      newResults.forEach((res) => results.push(res));
      interp = newInterp;
    });
    return [results, interp];
  }

  insert(record: Rec): AbstractInterpreter {
    const [_, newInterp] = this.evalStmt({ type: "Fact", record });
    return newInterp;
  }

  insertAll(records: Rec[]): AbstractInterpreter {
    return records.reduce((interp, rec) => interp.insert(rec), this);
  }

  queryStr(str: string): Res[] {
    const [record, errors] = parseRecord(str);
    if (errors.length > 0) {
      throw new ParseErrors(errors);
    }
    const [res, _] = this.evalStmt({
      type: "Query",
      record: parserTermToInternal(record) as Rec,
    });
    return res;
  }

  queryRec(record: Rec) {
    const [res, _] = this.evalStmt({ type: "Query", record });
    return res;
  }

  evalStr(str: string): [Res[], AbstractInterpreter] {
    const [main, errors] = parseMain(str);
    if (errors.length > 0) {
      throw new ParseErrors(errors);
    }
    return this.evalStmts(main.statement);
  }

  doLoad(path: string): AbstractInterpreter {
    const contents = this.loader(this.cwd + "/" + path);
    const [program, errors] = parseMain(contents);
    if (errors.length > 0) {
      throw new ParseErrors(errors);
    }
    let out: AbstractInterpreter = this;
    for (const stmt of program.statement) {
      const [_, newInterp] = out.evalStmt(parserStatementToInternal(stmt));
      out = newInterp;
    }
    return out;
  }

  getRelation(name: string): Relation | null {
    const table = this.getTables().find((t) => t === name);
    if (table) {
      return { type: "Table", name: table };
    }
    const rule = this.getRules().find((r) => r.head.relation === name);
    if (rule) {
      return { type: "Rule", name, rule };
    }
    return null;
  }

  // TODO: do these two with queries to virtual tables
  abstract getRules(): Rule[];
  abstract getTables(): string[];
}
