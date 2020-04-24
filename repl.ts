import { DB, newDB, Rec, Statement } from "./types";
import { language } from "./parser";
import { hasVars, optimize } from "./optimize";
import * as readline from "readline";
import { planQuery } from "./plan";
import { allResults, instantiate } from "./execNodes";
import { prettyPrintDB, prettyPrintPlan, prettyPrintResults } from "./pretty";
import * as pp from "prettier-printer";
import { ReadLine } from "readline";

export class Repl {
  db: DB;
  in: NodeJS.ReadableStream;
  out: NodeJS.WritableStream;
  buffer: string;
  stdinTTY: boolean;
  query: string;
  rl: readline.Interface;

  constructor(
    input: NodeJS.ReadableStream,
    out: NodeJS.WritableStream,
    stdinTTY: boolean,
    query: string
  ) {
    this.db = newDB();
    this.in = input;
    this.out = out;
    this.buffer = "";
    this.stdinTTY = stdinTTY;
    this.query = query.endsWith(".") ? query : `${query}.`;
  }

  run() {
    const opts: readline.ReadLineOptions = this.stdinTTY
      ? {
          input: this.in,
          output: this.out,
          prompt: "> ",
        }
      : { input: this.in };
    const rl = readline.createInterface(opts);
    rl.on("line", (line) => {
      this.handleLine(line);
    });
    rl.prompt();

    rl.on("close", () => {
      this.handleLine(this.query);
    });
    this.rl = rl;
  }

  private handleLine(line: string) {
    const rl = this.rl;
    if (line.length === 0) {
      rl.prompt();
      return;
    }
    // special commands
    // TODO: parse these with parser
    if (line === ".dump") {
      console.log(pp.render(100, prettyPrintDB(this.db)));
      rl.prompt();
      return;
    }
    this.buffer = this.buffer + line;
    if (!line.endsWith(".")) {
      return;
    }
    try {
      const stmt: Statement = language.statement.tryParse(this.buffer);
      this.handleStmt(stmt);
    } catch (e) {
      console.error("parse error", e.toString());
    } finally {
      this.buffer = "";
    }
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
    // TODO: allow stepping through one at-a-time like SWI-prolog, for infinite result sets...
    const plan = planQuery(this.db, record);
    const optPlan = optimize(plan);
    const execNode = instantiate(this.db, optPlan);
    const results = allResults(execNode);
    const printed = prettyPrintResults(results);
    console.log(pp.render(100, printed));
  }
}
