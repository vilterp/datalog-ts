import { Program, Rec, Res, Rule, Statement } from "./types";
import { language as dlLanguage } from "./parser";
import { Loader } from "./loaders";

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

  insert(record: Rec): AbstractInterpreter {
    const [_, newInterp] = this.evalStmt({ type: "Insert", record });
    return newInterp;
  }

  queryStr(str: string): Res[] {
    const record = dlLanguage.record.tryParse(str) as Rec;
    const [res, _] = this.evalStmt({ type: "Query", record });
    return res;
  }

  queryRec(record: Rec) {
    const [res, _] = this.evalStmt({ type: "Query", record });
    return res;
  }

  evalStr(str: string): [Res[], AbstractInterpreter] {
    const results: Res[] = [];
    const stmts = dlLanguage.program.tryParse(str);
    let curInterp: AbstractInterpreter = this;
    stmts.forEach((stmt) => {
      const [newResults, nextInterp] = curInterp.evalStmt(stmt);
      curInterp = nextInterp;
      newResults.forEach((res) => results.push(res));
    })
    return [results, curInterp];
  }

  doLoad(path: string): AbstractInterpreter {
    const contents = this.loader(this.cwd + "/" + path);
    const program: Program = dlLanguage.program.tryParse(contents);
    let out: AbstractInterpreter = this;
    for (const stmt of program) {
      const [_, newInterp] = out.evalStmt(stmt);
      out = newInterp;
    }
    return out;
  }

  // TODO: do these two with queries to virtual tables
  abstract getRules(): Rule[];
  abstract getTables(): string[];
}
