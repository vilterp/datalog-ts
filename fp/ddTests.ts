import { Interpreter } from "../interpreter";
import { Suite } from "../testing";
import { runDDTestAtPath } from "../util/dataDrivenTests";
import { DDTest, Result } from "../util/dataDrivenTests";
import { language } from "./parser";
import {
  prettyPrintTerm,
  ppt,
  defaultTracePrintOpts,
  TracePrintOpts,
  prettyPrintTrace,
  prettyPrintSituatedBinding,
} from "../pretty";
import * as pp from "prettier-printer";
import { flatten } from "./flatten";
import { fsLoader } from "../repl";
import { Rec } from "../types";
import { traceToTree, getRelatedPaths } from "../traceTree";

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
          (t) => traceTest(t, defaultTracePrintOpts),
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

function parseTest(test: DDTest): string[] {
  return test.map((tc) =>
    JSON.stringify(language.expr.tryParse(tc.input), null, 2)
  );
}

function flattenTest(test: DDTest): string[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    const rendered = printed.map((t) => pp.render(100, t) + ".");
    return rendered.join("\n");
  });
}

// flatten, then print out all scope and types
// TODO: DRY up a bit
function typecheckTest(test: DDTest): string[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);
    const rendered = flattened.map((t) => ppt(t) + ".");

    const interp = new Interpreter("fp/dl", fsLoader); // hmmm
    const interp2 = flattened.reduce<Interpreter>(
      (interp, t) => interp.evalStmt({ type: "Insert", record: t as Rec })[1],
      interp
    );
    const interp3 = interp2.doLoad("main.dl");
    const scopeResults = interp3.queryStr(
      "tc.ScopeItem{id: I, name: N, type: T}"
    );
    const typeResults = interp3.queryStr("tc.Type{id: I, type: T}");
    return [
      ...rendered,
      ...scopeResults.results.map((r) => ppt(r.term) + ".").sort(),
      ...typeResults.results.map((r) => ppt(r.term) + ".").sort(),
    ].join("\n");
  });
}

function suggestionTest(test: DDTest): string[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);

    const interp = new Interpreter("fp/dl", fsLoader); // hmmm
    const interp2 = flattened.reduce<Interpreter>(
      (interp, t) => interp.evalStmt({ type: "Insert", record: t as Rec })[1],
      interp
    );
    const interp3 = interp2.doLoad("main.dl");
    const suggResults = interp3.queryStr(
      "ide.Suggestion{id: I, name: N, type: T}"
    );
    return [...suggResults.results.map((r) => ppt(r.term) + ".").sort()].join(
      "\n"
    );
  });
}

function traceTest(test: DDTest, opts: TracePrintOpts): string[] {
  return test.map((tc) => {
    const [expr, bindingName] = tc.input.split("\n");
    const parsed = language.expr.tryParse(expr);
    const flattened = flatten(parsed);

    const interp = new Interpreter("fp/dl", fsLoader); // hmmm
    const interp2 = flattened.reduce((interp, t) => {
      return interp.evalStmt({ type: "Insert", record: t as Rec })[1];
    }, interp);
    const interp3 = interp2.doLoad("main.dl");
    // TODO: why does interpacing I with 0 return no results
    const typeResults = interp3.queryStr("tc.Type{id: 0, type: T}");
    if (typeResults.results.length !== 1) {
      throw new Error(
        `expecting one result, got ${typeResults.results.length}`
      );
    }
    const res = typeResults.results[0];
    // TODO: allow input of full situated path; get parents (write scope path parser? ugh)
    const { children } = getRelatedPaths(res, { path: [], name: bindingName });
    const childPaths = children.map((c) =>
      pp.render(100, prettyPrintSituatedBinding(c))
    );
    return (
      prettyPrintTrace(traceToTree(res), opts) +
      "\n" +
      "CHILD PATHS\n" +
      childPaths.join("\n")
    );
  });
}
