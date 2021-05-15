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
    const stmt = dlLanguage.statement.tryParse(str);
    return this.evalStmt(stmt);
  }

  doLoad(path: string): AbstractInterpreter {
    const contents = this.loader(this.cwd + "/" + path);
    const program: Program = dlLanguage.program.tryParse(contents);
    return program.reduce<AbstractInterpreter>(
      (interp, stmt) => interp.evalStmt(stmt)[1],
      this
    );
  }

  // TODO: do these two with queries to virtual tables
  abstract getRules(): Rule[];
  abstract getTables(): string[];
}
