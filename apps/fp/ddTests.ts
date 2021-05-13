import { Interpreter } from "../../core/interpreter";
import { Suite } from "../../util/testing";
import { TestOutput, runDDTestAtPath } from "../../util/ddTest";
import { language } from "./parser";
import {
  prettyPrintTerm,
  ppt,
  defaultTracePrintOpts,
  TracePrintOpts,
  prettyPrintTrace,
  prettyPrintSituatedBinding,
} from "../../core/pretty";
import * as pp from "prettier-printer";
import { flatten } from "./flatten";
import { Rec } from "../../core/types";
import { traceToTree, getRelatedPaths } from "../../core/traceTree";
import { fsLoader } from "../../core/fsLoader";
import { datalogOut, jsonOut, plainTextOut } from "../../util/ddTest/types";

export function fpTests(writeResults: boolean): Suite {
  return [
    {
      name: "parse",
      test() {
        runDDTestAtPath(
          "apps/fp/testdata/parse.dd.txt",
          parseTest,
          writeResults
        );
      },
    },
    {
      name: "flatten",
      test() {
        runDDTestAtPath(
          "apps/fp/testdata/flatten.dd.txt",
          flattenTest,
          writeResults
        );
      },
    },
    {
      name: "typecheck",
      test() {
        runDDTestAtPath(
          "apps/fp/testdata/typecheck.dd.txt",
          typecheckTest,
          writeResults
        );
      },
    },
    {
      name: "suggestion",
      test() {
        runDDTestAtPath(
          "apps/fp/testdata/suggestion.dd.txt",
          suggestionTest,
          writeResults
        );
      },
    },
    {
      name: "trace",
      test() {
        runDDTestAtPath(
          "apps/fp/testdata/trace.dd.txt",
          (t) => traceTest(t, defaultTracePrintOpts),
          writeResults
        );
      },
    },
    {
      name: "tracePaths",
      test() {
        runDDTestAtPath(
          "apps/fp/testdata/tracePaths.dd.txt",
          (t) => traceTest(t, { showScopePath: true }),
          writeResults
        );
      },
    },
  ];
}

function parseTest(test: string[]): TestOutput[] {
  return test.map((input) => jsonOut(language.expr.tryParse(input)));
}

function flattenTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const parsed = language.expr.tryParse(input);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    const rendered = printed.map((t) => pp.render(100, t) + ".");
    return datalogOut(rendered.join("\n") + "\n");
  });
}

// flatten, then print out all scope and types
// TODO: DRY up a bit
function typecheckTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const parsed = language.expr.tryParse(input);
    const flattened = flatten(parsed);
    const rendered = flattened.map((t) => ppt(t) + ".");

    const interp = new Interpreter("apps/fp/dl", fsLoader); // hmmm
    const interp2 = flattened.reduce<Interpreter>(
      (interp, t) => interp.evalStmt({ type: "Insert", record: t as Rec })[1],
      interp
    );
    const interp3 = interp2.doLoad("main.dl");
    const scopeResults = interp3.queryStr(
      "tc.ScopeItem{id: I, name: N, type: T}"
    );
    const typeResults = interp3.queryStr("tc.Type{id: I, type: T}");
    return plainTextOut(
      [
        ...rendered,
        ...scopeResults.results.map((r) => ppt(r.term) + ".").sort(),
        ...typeResults.results.map((r) => ppt(r.term) + ".").sort(),
      ].join("\n") + "\n"
    );
  });
}

function suggestionTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const parsed = language.expr.tryParse(input);
    const flattened = flatten(parsed);

    const interp = new Interpreter("apps/fp/dl", fsLoader); // hmmm
    const interp2 = flattened.reduce<Interpreter>(
      (interp, t) => interp.evalStmt({ type: "Insert", record: t as Rec })[1],
      interp
    );
    const interp3 = interp2.doLoad("main.dl");
    const suggResults = interp3.queryStr(
      "ide.Suggestion{id: I, name: N, type: T}"
    );
    return plainTextOut(
      [...suggResults.results.map((r) => ppt(r.term) + ".").sort()].join("\n") +
        "\n"
    );
  });
}

function traceTest(test: string[], opts: TracePrintOpts): TestOutput[] {
  return test.map((input) => {
    const [expr, bindingName] = input.split("\n");
    const parsed = language.expr.tryParse(expr);
    const flattened = flatten(parsed);

    const interp = new Interpreter("apps/fp/dl", fsLoader); // hmmm
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
    return plainTextOut(
      prettyPrintTrace(traceToTree(res), opts) +
        "\n" +
        "CHILD PATHS\n" +
        childPaths.join("\n") +
        "\n"
    );
  });
}
