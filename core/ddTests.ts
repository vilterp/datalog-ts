import { Suite } from "../util/testing";
import { runDDTestAtPath, TestOutput } from "../util/ddTest";
import { SimpleInterpreter } from "./simple/interpreter";
import { ppt } from "./pretty";
import { fsLoader } from "./fsLoader";
import { datalogOut } from "../util/ddTest/types";

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

export function putThroughInterp(test: string[]): TestOutput[] {
  let interp = new SimpleInterpreter(".", fsLoader);

  const results: TestOutput[] = [];

  for (const input of test) {
    const [stmtResult, newInterp] = interp.evalStr(input + "\n");
    interp = newInterp;

    results.push(
      datalogOut(stmtResult.map((res) => ppt(res.term) + ".").join("\n"))
    );
  }

  return results;
}
