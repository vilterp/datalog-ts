import { ReplCore } from "../replCore";
import { Suite } from "../testing";
import { runDDTestAtPath } from "../util/dataDrivenTests";
import { DDTest, Result } from "../util/dataDrivenTests";
import { language } from "./parser";
import { prettyPrintTerm, ppt } from "../pretty";
import * as pp from "prettier-printer";
import { flatten } from "./flatten";
import { fsLoader } from "../repl";
import { Rec } from "../types";
import { prettyPrintTrace, TracePrintOpts, defaultOpts } from "../traceTree";

export function fpTests(writeResults: boolean): Suite {
  return [
    {
      name: "parse",
      test() {
        runDDTestAtPath("fp/testdata/parse.dd.txt", parseTest, writeResults);
      },
    },
    {
      name: "flatten",
      test() {
        runDDTestAtPath(
          "fp/testdata/flatten.dd.txt",
          flattenTest,
          writeResults
        );
      },
    },
    {
      name: "typecheck",
      test() {
        runDDTestAtPath(
          "fp/testdata/typecheck.dd.txt",
          typecheckTest,
          writeResults
        );
      },
    },
    {
      name: "suggestion",
      test() {
        runDDTestAtPath(
          "fp/testdata/suggestion.dd.txt",
          suggestionTest,
          writeResults
        );
      },
    },
    {
      name: "trace",
      test() {
        runDDTestAtPath(
          "fp/testdata/trace.dd.txt",
          (t) => traceTest(t, defaultOpts),
          writeResults
        );
      },
    },
    {
      name: "tracePaths",
      test() {
        runDDTestAtPath(
          "fp/testdata/tracePaths.dd.txt",
          (t) => traceTest(t, { showScopePath: true }),
          writeResults
        );
      },
    },
  ];
}

function parseTest(test: DDTest): Result[] {
  return test.map((tc) => ({
    pair: tc,
    actual: JSON.stringify(language.expr.tryParse(tc.input), null, 2) + "\n",
  }));
}

function flattenTest(test: DDTest): Result[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    const rendered = printed.map((t) => pp.render(100, t) + ".");
    return {
      pair: tc,
      actual: rendered.join("\n") + "\n",
    };
  });
}

// flatten, then print out all scope and types
// TODO: DRY up a bit
function typecheckTest(test: DDTest): Result[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);
    const rendered = flattened.map((t) => ppt(t) + ".");

    const repl = new ReplCore(fsLoader); // hmmm
    flattened.forEach((t) => {
      repl.evalStmt({ type: "Insert", record: t as Rec });
    });
    repl.doLoad("fp/typecheck.dl");
    repl.doLoad("fp/stdlib.dl");
    const scopeResults = repl.evalStr("scope_item{id: I, name: N, type: T}.");
    const typeResults = repl.evalStr("type{id: I, type: T}.");
    return {
      pair: tc,
      actual:
        [
          ...rendered,
          ...scopeResults.results.map((r) => ppt(r.term) + ".").sort(),
          ...typeResults.results.map((r) => ppt(r.term) + ".").sort(),
        ].join("\n") + "\n",
    };
  });
}

function suggestionTest(test: DDTest): Result[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);

    const repl = new ReplCore(fsLoader); // hmmm
    flattened.forEach((t) => {
      repl.evalStmt({ type: "Insert", record: t as Rec });
    });
    repl.doLoad("fp/typecheck.dl");
    repl.doLoad("fp/stdlib.dl");
    const suggResults = repl.evalStr("suggestion{id: I, name: N, type: T}.");
    return {
      pair: tc,
      actual:
        [...suggResults.results.map((r) => ppt(r.term) + ".").sort()].join(
          "\n"
        ) + "\n",
    };
  });
}

function traceTest(test: DDTest, opts: TracePrintOpts): Result[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);

    const repl = new ReplCore(fsLoader); // hmmm
    flattened.forEach((t) => {
      repl.evalStmt({ type: "Insert", record: t as Rec });
    });
    repl.doLoad("fp/typecheck.dl");
    repl.doLoad("fp/stdlib.dl");
    // TODO: why does replacing I with 0 return no results
    const typeResults = repl.evalStr("type{id: 0, type: T}.");
    if (typeResults.results.length !== 1) {
      throw new Error(
        `expecting one result, got ${typeResults.results.length}`
      );
    }
    return {
      pair: tc,
      actual: prettyPrintTrace(typeResults.results[0], opts) + "\n",
    };
  });
}
