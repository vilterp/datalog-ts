import * as readline from "readline";
import { ppt } from "./pretty";
import * as fs from "fs";
import { emptyRuleGraph, formatRes, RuleGraph } from "./incremental/types";
import { language } from "./parser";
import {
  formatOutput,
  Interpreter,
  newInterpreter,
  processStmt,
} from "./incremental/interpreter";
import { Loader } from "./loaders";

type Mode = "repl" | "pipe" | "test";

export class Repl {
  interp: Interpreter;
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
    this.interp = newInterpreter("fp/dl", loader);
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
      this.println(JSON.stringify(this.interp.graph, null, 2));
      rl.prompt();
      return;
      // } else if (line === ".resetFacts") {
      //   // TODO: this resets everything; supposed to just reset facts
      //   this.state = emptyRuleGraph;
      //   rl.prompt();
      //   return;
      // } else if (line === ".graphviz") {
      //   // TODO: remove dot...
      //   this.doGraphviz();
      //   rl.prompt();
      //   return;
    }
    this.buffer = this.buffer + line;
    if (!(line.endsWith(".") || line.startsWith(".") || line.startsWith("#"))) {
      return;
    }
    try {
      const stmt = language.statement.tryParse(this.buffer);
      const { newInterp, output } = processStmt(this.interp, stmt);
      this.interp = newInterp;
      const outputStr = formatOutput(newInterp.graph, output, {
        emissionLogMode: "repl",
        showBindings: false,
      });
      if (outputStr.length > 0) {
        this.println(outputStr);
      }
    } catch (e) {
      // TODO: distinguish between parse errors and others
      this.println(e.stack);
      if (this.mode === "pipe") {
        process.exit(-1);
      }
    } finally {
      this.buffer = "";
    }
    rl.prompt();
  }

  // private doGraphviz() {
  //   const edges = this.state.evalStr("edge{from: F, to: T, label: L}.");
  //   const nodes = this.state.evalStr("node{id: I, label: L}.");
  //   // TODO: oof, all this typecasting
  //   const g: Graph = {
  //     edges: edges.results.map((e) => {
  //       const rec = e.term as Rec;
  //       return {
  //         from: (rec.attrs.from as StringLit).val,
  //         to: (rec.attrs.to as StringLit).val,
  //         attrs: { label: (rec.attrs.label as StringLit).val },
  //       };
  //     }),
  //     nodes: nodes.results.map((n) => {
  //       const rec = n.term as Rec;
  //       return {
  //         id: (rec.attrs.id as StringLit).val,
  //         attrs: { label: (rec.attrs.label as StringLit).val },
  //       };
  //     }),
  //   };
  //   this.println(prettyPrintGraph(g));
  // }

  private println(...strings: string[]) {
    // console.log("printing", strings[0], strings[1], strings[2]);
    this.out.write(strings.join(" ") + "\n");
  }
}

export const fsLoader: Loader = (path) => fs.readFileSync(path).toString();
