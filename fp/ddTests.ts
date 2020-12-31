import { Suite } from "../util/testing";
import { DDTest, runDDTestAtPath } from "../util/ddTest";
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
import { Interpreter } from "../incremental/interpreter";
import {
  datalogOut,
  jsonOut,
  plainTextOut,
  TestOutput,
} from "../util/ddTest/types";
import { suiteFromDDTestsInDir } from "../util/ddTest/runner";

export function fpTests(writeResults: boolean): Suite {
  return suiteFromDDTestsInDir("fp/testdata", writeResults, [
    ["parse", parseTest],
    ["flatten", flattenTest],
    ["typecheck", typecheckTest],
    ["suggestion", suggestionTest],
    // ["trace", (t) => traceTest(t, defaultTracePrintOpts)],
    // ["tracePaths", (t) => traceTest(t, { showScopePath: true })],
  ]);
}

function parseTest(test: string[]): TestOutput[] {
  return test.map((tc) =>
    jsonOut(JSON.stringify(language.expr.tryParse(tc), null, 2))
  );
}

function flattenTest(test: string[]): TestOutput[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    const rendered = printed.map((t) => pp.render(100, t) + ".");
    return datalogOut(rendered.join("\n"));
  });
}

// flatten, then print out all scope and types
// TODO: DRY up a bit
function typecheckTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const parsed = language.expr.tryParse(input);
    const flattened = flatten(parsed);
    const rendered = flattened.map((t) => ppt(t) + ".");

    const interp = new Interpreter(fsLoader);
    interp.processStmt({
      type: "LoadStmt",
      path: "fp/dl/main.dl",
    });
    flattened.forEach((t) =>
      interp.processStmt({ type: "Insert", record: t as Rec })
    );
    const scopeResults = interp.queryStr(
      "tc.ScopeItem{id: I, name: N, type: T}"
    );
    const typeResults = interp.queryStr("tc.Type{id: I, type: T}");
    return datalogOut(
      [
        ...rendered,
        ...scopeResults.map((r) => ppt(r.term) + ".").sort(),
        ...typeResults.map((r) => ppt(r.term) + ".").sort(),
      ].join("\n")
    );
  });
}

function suggestionTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const parsed = language.expr.tryParse(input);
    const flattened = flatten(parsed);

    const interp = new Interpreter(fsLoader);
    interp.processStmt({
      type: "LoadStmt",
      path: "fp/dl/main.dl",
    });
    flattened.forEach((t) =>
      interp.processStmt({ type: "Insert", record: t as Rec })
    );
    const suggResults = interp.queryStr(
      "ide.Suggestion{id: I, name: N, type: T}"
    );
    return datalogOut(
      [...suggResults.map((r) => ppt(r.term) + ".").sort()].join("\n")
    );
  });
}

// TODO: re-enable traces
// function traceTest(test: DDTest, opts: TracePrintOpts): string[] {
//   return test.map((tc) => {
//     const [expr, bindingName] = tc.input.split("\n");
//     const parsed = language.expr.tryParse(expr);
//     const flattened = flatten(parsed);
//
//     const interp = newInterpreter(fsLoader); // hmmm
//     const interp2 = processStmt(interp, { type: "LoadStmt", path: "main.dl" }).newInterp;
//     const interp3 = flattened.reduce<Interpreter>(
//       (interp, t) =>
//         processStmt(interp, { type: "Insert", record: t as Rec }).newInterp,
//       interp2
//     );
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
