import { Suite } from "../util/testing";
import { DDTest, Result, runDDTestAtPath } from "../util/dataDrivenTests";
import { Interpreter } from "./interpreter";
import { ppt } from "./pretty";
import { fsLoader } from "./fsLoader";

export function coreTests(writeResults: boolean): Suite {
  return ["simple", "family", "recurse", "literals"].map((name) => ({
    name,
    test() {
      runDDTestAtPath(
        `core/testdata/${name}.dd.txt`,
        putThroughInterp,
        writeResults
      );
    },
  }));
}

export function putThroughInterp(test: DDTest): Result[] {
  let interp = new Interpreter(".", fsLoader);

  const results: Result[] = [];

  for (const pair of test) {
    const [stmtResult, newInterp] = interp.evalStr(pair.input + "\n");
    interp = newInterp;

    results.push({
      pair,
      actual: stmtResult.results.map((res) => ppt(res.term) + ".").join("\n"),
    });
  }

  return results;
}
