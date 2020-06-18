import { ReplCore } from "./replCore";
import { Rec, StringLit } from "./types";
import * as readline from "readline";
import {
  prettyPrintDB,
  prettyPrintTerm,
  prettyPrintTrace,
  defaultTracePrintOpts,
} from "./pretty";
import * as pp from "prettier-printer";
import { Graph, prettyPrintGraph } from "./graphviz";
import * as fs from "fs";
import { traceToTree } from "./traceTree";

type Mode = "repl" | "pipe" | "test";

export class Repl {
  core: ReplCore;
  in: NodeJS.ReadableStream;
  out: NodeJS.WritableStream;
  buffer: string;
  mode: Mode;
  query: string | null;
  rl: readline.Interface;

  constructor(
    input: NodeJS.ReadableStream,
    out: NodeJS.WritableStream,
    mode: Mode,
    query: string,
    loader: Loader
  ) {
    this.core = new ReplCore(loader);
    this.in = input;
    this.out = out;
    this.buffer = "";
    this.mode = mode;
    if (query) {
      this.query = query;
    } else {
      this.query = null;
    }
  }

  run() {
    const opts: readline.ReadLineOptions =
      this.mode === "repl"
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

  handleLine(line: string) {
    const rl = this.rl;
    if (line.length === 0) {
      rl.prompt();
      return;
    }
    // special commands
    // TODO: parse these with parser
    if (line === ".dump") {
      this.println(pp.render(100, prettyPrintDB(this.core.db)));
      rl.prompt();
      return;
    } else if (line === ".resetFacts") {
      this.core.db.tables = {};
      rl.prompt();
      return;
    } else if (line === ".graphviz") {
      // TODO: remove dot...
      this.doGraphviz();
      rl.prompt();
      return;
    }
    this.buffer = this.buffer + line;
    if (!(line.endsWith(".") || line.startsWith(".") || line.startsWith("#"))) {
      return;
    }
    try {
      const stmtResult = this.core.evalStr(this.buffer);
      stmtResult.results.forEach((res) => {
        this.println(
          stmtResult.trace
            ? prettyPrintTrace(traceToTree(res), defaultTracePrintOpts)
            : pp.render(100, prettyPrintTerm(res.term)) + "."
        );
      });
    } catch (e) {
      // TODO: distinguish between parse errors and others
      this.println("error", e.toString(), e.stack);
      if (this.mode === "pipe") {
        process.exit(-1);
      }
    } finally {
      this.buffer = "";
    }
    rl.prompt();
  }

  private doGraphviz() {
    const edges = this.core.evalStr("edge{from: F, to: T, label: L}.");
    const nodes = this.core.evalStr("node{id: I, label: L}.");
    // TODO: oof, all this typecasting
    const g: Graph = {
      edges: edges.results.map((e) => {
        const rec = e.term as Rec;
        return {
          from: (rec.attrs.from as StringLit).val,
          to: (rec.attrs.to as StringLit).val,
          attrs: { label: (rec.attrs.label as StringLit).val },
        };
      }),
      nodes: nodes.results.map((n) => {
        const rec = n.term as Rec;
        return {
          id: (rec.attrs.id as StringLit).val,
          attrs: { label: (rec.attrs.label as StringLit).val },
        };
      }),
    };
    this.println(prettyPrintGraph(g));
  }

  private println(...strings: string[]) {
    // console.log("printing", strings[0], strings[1], strings[2]);
    this.out.write(strings.join(" ") + "\n");
  }
}

// throws an exception if it's not there I guess
// TODO: wish there was a stdlib Result<E, T> type, lol
// keeping synchronous for now
export type Loader = (path: string) => string;

export const fsLoader: Loader = (path) => fs.readFileSync(path).toString();
