import { DB, newDB, Rec, Statement } from "./types";
import { language } from "./parser";
import { hasVars, optimize } from "./optimize";
import * as readline from "readline";
import { planQuery } from "./plan";
import { allResults, instantiate } from "./execNodes";
import { prettyPrintDB, prettyPrintResults } from "./pretty";
import * as pp from "prettier-printer";

export class Repl {
  db: DB;
  in: NodeJS.ReadableStream;
  out: NodeJS.WritableStream;

  constructor(input: NodeJS.ReadableStream, out: NodeJS.WritableStream) {
    this.db = newDB();
    this.in = input;
    this.out = out;
  }

  run() {
    const opts: readline.ReadLineOptions = {
      input: this.in,
      output: this.out,
      prompt: "> ",
    };
    const rl = readline.createInterface(opts);
    rl.on("line", (line) => {
      if (line.length === 0) {
        rl.prompt();
        return;
      }
      console.log(line);
      if (line === ".dump") {
        console.log(pp.render(100, prettyPrintDB(this.db)));
        rl.prompt();
        return;
      }
      try {
        const stmt: Statement = language.statement.tryParse(line);
        console.log("parsed:", stmt);
        this.handleStmt(stmt);
      } catch (e) {
        console.error("parse error", e.toString());
      }
      rl.prompt();
    });
    rl.prompt();
  }

  private handleStmt(stmt: Statement) {
    switch (stmt.type) {
      case "Insert": {
        const record = stmt.record;
        if (hasVars(record)) {
          this.runQuery(record);
          break;
        }
        let tbl = this.db.tables[record.relation];
        if (!tbl) {
          tbl = [];
          this.db.tables[record.relation] = tbl;
        }
        tbl.push(record);
        break;
      }
      case "Rule": {
        const rule = stmt.rule;
        this.db.rules[rule.head.relation] = rule;
        break;
      }
    }
  }

  private runQuery(record: Rec) {
    console.log("runQuery", record);
    // TODO: allow stepping through one at-a-time like SWI-prolog, for infinite result sets...
    const plan = planQuery(this.db, record);
    const optPlan = optimize(plan);
    const execNode = instantiate(this.db, optPlan);
    const results = allResults(execNode);
    const printed = prettyPrintResults(results);
    console.log(printed);
  }
}
