import { DB, newDB, rec, Rec, Rule, Statement } from "./types";
import * as readline from "readline";
import { language } from "./parser";

class Repl {
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
    rl.on("line", (input) => {
      try {
        const stmt: Statement = language.statement.tryParse(input);
        this.handleStmt(stmt);
      } catch (e) {
        console.error("parse error", e);
      }
    });
  }

  private handleStmt(stmt: Statement) {
    switch (stmt.type) {
      case "Insert": {
        const record = stmt.record;
        let tbl = this.db.tables[record.relation];
        if (!tbl) {
          tbl = [];
          this.db.tables[record.relation] = tbl;
        }
        tbl.push(record);
        break;
      }
      case "Rule":
        // TODO: run query if has vars
        this.db.rules[stmt.rule.head.relation] = stmt.rule;
        break;
    }
  }
}
