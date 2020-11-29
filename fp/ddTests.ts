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
import {
  Interpreter,
  newInterpreter,
  processStmt,
  queryStr,
} from "../incremental/interpreter";

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
    // TODO: re-enable
    // {
    //   name: "trace",
    //   test() {
    //     runDDTestAtPath(
    //       "fp/testdata/trace.dd.txt",
    //       (t) => traceTest(t, defaultTracePrintOpts),
    //       writeResults
    //     );
    //   },
    // },
    // {
    //   name: "tracePaths",
    //   test() {
    //     runDDTestAtPath(
    //       "fp/testdata/tracePaths.dd.txt",
    //       (t) => traceTest(t, { showScopePath: true }),
    //       writeResults
    //     );
    //   },
    // },
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

    const interp = newInterpreter("fp/dl", fsLoader); // hmmm
    const interp2 = processStmt(interp, { type: "LoadStmt", path: "main.dl" })
      .newInterp;
    const interp3 = flattened.reduce<Interpreter>(
      (interp, t) =>
        processStmt(interp, { type: "Insert", record: t as Rec }).newInterp,
      interp2
    );
    const scopeResults = queryStr(
      interp3,
      "tc.ScopeItem{id: I, name: N, type: T}"
    );
    const typeResults = queryStr(interp3, "tc.Type{id: I, type: T}");
    return [
      ...rendered,
      ...scopeResults.map((r) => ppt(r.term) + ".").sort(),
      ...typeResults.map((r) => ppt(r.term) + ".").sort(),
    ].join("\n");
  });
}

function suggestionTest(test: DDTest): string[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);

    const interp = newInterpreter("fp/dl", fsLoader); // hmmm
    const interp2 = processStmt(interp, { type: "LoadStmt", path: "main.dl" })
      .newInterp;
    const interp3 = flattened.reduce<Interpreter>(
      (interp, t) =>
        processStmt(interp, { type: "Insert", record: t as Rec }).newInterp,
      interp2
    );
    const suggResults = queryStr(
      interp3,
      "ide.Suggestion{id: I, name: N, type: T}"
    );
    return [...suggResults.map((r) => ppt(r.term) + ".").sort()].join("\n");
  });
}

// TODO: re-enable traces
// function traceTest(test: DDTest, opts: TracePrintOpts): string[] {
//   return test.map((tc) => {
//     const [expr, bindingName] = tc.input.split("\n");
//     const parsed = language.expr.tryParse(expr);
//     const flattened = flatten(parsed);
//
//     const interp = newInterpreter("fp/dl", fsLoader); // hmmm
//     const interp2 = flattened.reduce<Interpreter>(
//       (interp, t) =>
//         processStmt(interp, { type: "Insert", record: t as Rec }).newInterp,
//       interp
//     );
//     const interp3 = processStmt(interp2, { type: "LoadStmt", path: "main.dl" }).newInterp;
//     // TODO: why does interpacing I with 0 return no results
//     const typeResults = queryStr(interp3, "tc.Type{id: 0, type: T}");
//     if (typeResults.length !== 1) {
//       throw new Error(
//         `expecting one result, got ${typeResults.length}`
//       );
//     }
//     const res = typeResults[0];
//     // TODO: allow input of full situated path; get parents (write scope path parser? ugh)
//     const { children } = getRelatedPaths(res, { path: [], name: bindingName });
//     const childPaths = children.map((c) =>
//       pp.render(100, prettyPrintSituatedBinding(c))
//     );
//     return (
//       prettyPrintTrace(traceToTree(res), opts) +
//       "\n" +
//       "CHILD PATHS\n" +
//       childPaths.join("\n")
//     );
//   });
// }
