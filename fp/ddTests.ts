import { Suite } from "../testing";
import { runDDTestAtPath } from "../util/dataDrivenTests";
import { DDTest, Result } from "../util/dataDrivenTests";
import { language } from "./parser";
import { prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";
import { flatten } from "./flatten";
import { fsLoader, Repl } from "../repl";
import { Rec } from "../types";
import { readAll, identityTransform } from "../streamUtil";

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
function typecheckTest(test: DDTest): Result[] {
  return test.map((tc) => {
    const parsed = language.expr.tryParse(tc.input);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    const rendered = printed.map((t) => pp.render(100, t) + ".");

    // TODO: use ReplCore directly, without stream?
    const outStream = identityTransform();
    const inStream = identityTransform();
    const repl = new Repl(inStream, outStream, "test", "", fsLoader); // hmmm
    repl.run();
    flattened.forEach((t) => {
      repl.core.evalStmt({ type: "Insert", record: t as Rec });
    });
    repl.core.doLoad("fp/typecheck.dl");
    repl.core.doLoad("fp/stdlib.dl");
    repl.handleLine("scope_item{id: I, name: N, type: T}.");
    const scopeOut = readAll(outStream).split("\n").sort();
    repl.handleLine("type{id: I, type: T}.");
    const typeOut = readAll(outStream).split("\n").sort();
    return {
      pair: tc,
      // TODO: this uniq is sweeping dupes under the rug... find out why they're there
      actual:
        [...rendered, ...scopeOut.slice(1), ...typeOut.slice(1)].join("\n") +
        "\n",
    };
  });
}
