import {
  DB,
  newDB,
  Program,
  rec,
  Rec,
  Res,
  Statement,
  StringLit,
  varr,
} from "./types";
import { language } from "./parser";
import { hasVars, optimize } from "./optimize";
import * as readline from "readline";
import { planQuery } from "./plan";
import { allResults, ExecNode, instantiate } from "./execNodes";
import {
  prettyPrintDB,
  prettyPrintTerm,
  prettyPrintPlan,
  prettyPrintBindings,
} from "./pretty";
import * as pp from "prettier-printer";
import { Graph, prettyPrintGraph } from "./graphviz";
import * as fs from "fs";
import { evaluate } from "./simpleEvaluate";
import * as util from "util";

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
      this.query = query;
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
    if (line === ".dump") {
      this.println(pp.render(100, prettyPrintDB(this.db)));
      rl.prompt();
      return;
    } else if (line === ".graphviz") {
      // TODO: remove dot...
      this.doGraphviz();
      rl.prompt();
      return;
    } else if (line.startsWith(".explain ")) {
      this.doExplain(line.slice(".explain ".length));
      return;
    } else if (line.startsWith(".load ")) {
      this.doLoad(line.slice(".load ".length));
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
      this.println("error", e.toString(), e.stack);
      if (!this.stdinTTY) {
        process.exit(-1);
      }
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

  private getExecNode(record: Rec): ExecNode {
    const plan = planQuery(this.db, record);
    const optPlan = optimize(plan);
    return instantiate(this.db, optPlan, optPlan.rules[optPlan.main]);
  }

  private runQuery(record: Rec): Res[] {
    const execNode = this.getExecNode(record);
    return allResults(execNode);
  }

  private printQuery(record: Rec) {
    const results = evaluate(this.db, record);
    for (const res of results) {
      // console.log(util.inspect(res, { depth: null }));
      this.println(
        pp.render(100, [
          prettyPrintTerm(res.term),
          // "; ",
          // prettyPrintBindings(res.bindings),
          ".",
        ])
      );
    }
  }

  private doGraphviz() {
    const edges = evaluate(
      this.db,
      rec("edge", { from: varr("F"), to: varr("T"), label: varr("L") })
    );
    const nodes = evaluate(
      this.db,
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
    this.println(prettyPrintGraph(g));
  }

  private doExplain(s: string) {
    try {
      const insert = language.insert.tryParse(s);
      const plan = planQuery(this.db, insert.record);
      const optPlan = optimize(plan);
      this.println(pp.render(100, prettyPrintPlan(optPlan)));
    } catch (e) {
      this.println("error: ", e.toString(), e.stack);
    }
    this.rl.prompt();
  }

  private doLoad(path: string) {
    try {
      const buf = fs.readFileSync(path);
      const program: Program = language.program.tryParse(buf.toString());
      for (const stmt of program) {
        this.handleStmt(stmt);
      }
    } catch (e) {
      this.println("error: ", e);
    }
    this.rl.prompt();
  }

  private println(...strings: string[]) {
    // console.log("printing", strings[0], strings[1], strings[2]);
    this.out.write(strings.join(" ") + "\n");
  }
}
