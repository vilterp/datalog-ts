import { SimpleInterpreter } from "../../../core/simple/interpreter";
import { Loader } from "../../../core/loaders";
import { Rec, StringLit } from "../../../core/types";
import * as readline from "readline";
import { prettyPrintTerm } from "../../../core/pretty";
import * as pp from "prettier-printer";
import { Graph, prettyPrintGraph } from "../../../util/graphviz";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { IncrementalInterpreter } from "../../../core/incremental/interpreter";

type Mode = "repl" | "pipe" | "test";

export class Repl {
  interp: AbstractInterpreter;
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
    this.interp = new IncrementalInterpreter(__dirname, loader);
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
    if (line === ".graphviz") {
      // TODO: remove dot...
      // TODO: allow whole config to be passed in...
      this.doGraphviz(
        { query: "node{id: I, label: L}", idAttr: "id", labelAttr: "label" },
        {
          query: "edge{from: F, to: T, label: L}",
          labelAttr: "label",
          fromAttr: "from",
          toAttr: "to",
        }
      );
      rl.prompt();
      return;
    } else if (line === ".ruleGraph") {
      this.doGraphviz(
        {
          query: "internal.Relation{name: N, type: T}",
          idAttr: "name",
          labelAttr: "name",
        },
        {
          query: "internal.RelationReference{from: F, to: T}",
          fromAttr: "from",
          toAttr: "to",
        }
      );
      rl.prompt();
      return;
    }
    this.buffer = this.buffer + line;
    if (
      !(
        line.endsWith(".") ||
        line.endsWith("?") ||
        line.startsWith(".") ||
        line.startsWith("#")
      )
    ) {
      return;
    }
    try {
      const [stmtResult, interp] = this.interp.evalStr(this.buffer);
      this.interp = interp;
      stmtResult.forEach((res) => {
        this.println(pp.render(100, prettyPrintTerm(res.term)) + ".");
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

  private doGraphviz(
    nodesConfig: { query: string; idAttr: string; labelAttr: string },
    edgesConfig: {
      query: string;
      fromAttr: string;
      toAttr: string;
      labelAttr?: string;
    }
  ) {
    const edges = this.interp.queryStr(edgesConfig.query);
    const nodes = this.interp.queryStr(nodesConfig.query);
    // TODO: oof, all this typecasting
    const g: Graph = {
      edges: edges.map((e) => {
        const rec = e.term as Rec;
        return {
          from: (rec.attrs[edgesConfig.fromAttr] as StringLit).val,
          to: (rec.attrs[edgesConfig.toAttr] as StringLit).val,
          attrs: {
            label: edgesConfig.labelAttr
              ? (rec.attrs[edgesConfig.labelAttr] as StringLit).val
              : "",
          },
        };
      }),
      nodes: nodes.map((n) => {
        const rec = n.term as Rec;
        return {
          id: (rec.attrs[nodesConfig.idAttr] as StringLit).val,
          attrs: {
            label: (rec.attrs[nodesConfig.labelAttr] as StringLit)?.val,
          },
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
