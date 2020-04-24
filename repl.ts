import { DB, newDB, rec, Rec, Res, Statement, StringLit, varr } from "./types";
import { language } from "./parser";
import { hasVars, optimize } from "./optimize";
import * as readline from "readline";
import { planQuery } from "./plan";
import { allResults, instantiate } from "./execNodes";
import { prettyPrintDB, prettyPrintResults, prettyPrintTerm } from "./pretty";
import * as pp from "prettier-printer";
import { Graph, prettyPrintGraph } from "./graphviz";

export class Repl {
  db: DB;
  in: NodeJS.ReadableStream;
  out: NodeJS.WritableStream;
  buffer: string;
  stdinTTY: boolean;
  query: string | null;
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
    if (query) {
      this.query = query.endsWith(".") ? query : `${query}.`;
    } else {
      this.query = null;
    }
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
      if (this.query) {
        this.handleLine(this.query);
      }
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
    if (line === ".dump.") {
      console.log(pp.render(100, prettyPrintDB(this.db)));
      rl.prompt();
      return;
    } else if (line === ".graphviz.") {
      // TODO: remove dot...
      this.doGraphviz();
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
      // TODO: distinguish between parse errors and others
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
          this.printQuery(record);
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

  private runQuery(record: Rec): Res[] {
    // TODO: allow stepping through one at-a-time like SWI-prolog, for infinite result sets...
    const plan = planQuery(this.db, record);
    const optPlan = optimize(plan);
    const execNode = instantiate(this.db, optPlan);
    return allResults(execNode);
  }

  private printQuery(record: Rec) {
    const results = this.runQuery(record);
    const printed = pp.intersperse(pp.lineBreak)(
      results.map((r) => [prettyPrintTerm(r.term), "."])
    );
    console.log(pp.render(100, printed));
  }

  private doGraphviz() {
    const edges = this.runQuery(
      rec("edge", { from: varr("F"), to: varr("T"), label: varr("L") })
    );
    const nodes = this.runQuery(
      rec("node", { id: varr("I"), name: varr("N") })
    );
    // TODO: oof, all this typecasting
    const g: Graph = {
      edges: edges.map((e) => {
        const rec = e.term as Rec;
        return {
          from: (rec.attrs.from as StringLit).val,
          to: (rec.attrs.to as StringLit).val,
          attrs: { label: (rec.attrs.label as StringLit).val },
        };
      }),
      nodes: nodes.map((n) => {
        const rec = n.term as Rec;
        return {
          id: (rec.attrs.id as StringLit).val,
          attrs: { name: (rec.attrs.name as StringLit).val },
        };
      }),
    };
    console.log(prettyPrintGraph(g));
  }
}
