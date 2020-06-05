import { ReplCore } from "../replCore";
import { ppt } from "../simpleEvaluate";
import { Suite } from "../testing";
import { runDDTestAtPath } from "../util/dataDrivenTests";
import { DDTest, Result } from "../util/dataDrivenTests";
import { language } from "./parser";
import { prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";
import { flatten } from "./flatten";
import { fsLoader, Repl } from "../repl";
import { Rec } from "../types";

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
          ...scopeResults.map((r) => ppt(r.term) + ".").sort(),
          ...typeResults.map((r) => ppt(r.term) + ".").sort(),
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
        [...suggResults.map((r) => ppt(r.term) + ".").sort()].join("\n") + "\n",
    };
  });
}
