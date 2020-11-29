import { Suite } from "./testing";
import { fsLoader, Repl } from "./repl";
import { DDTest, runDDTestAtPath } from "./util/ddTest";
import { identityTransform, readAll } from "./streamUtil";
import { TestOutput, plainTextOut } from "./util/ddTest/types";

const ddTestSuites = ["simple", "family", "recurse", "literals"];
// const ddTestSuites = ["simple"];

export function replTests(writeResults: boolean): Suite {
  return ddTestSuites.map((name) => ({
    name,
    test() {
      runDDTestAtPath(`testdata/${name}.dd.txt`, putThroughRepl, writeResults);
    },
  }));
}

export function putThroughRepl(test: DDTest): TestOutput[] {
  const input = identityTransform();
  const output = identityTransform();
  const repl = new Repl(input, output, "test", "", fsLoader);
  repl.run();

  const results: TestOutput[] = [];

  for (const pair of test) {
    input.write(pair.input + "\n");

    const out = readAll(output);

    results.push(plainTextOut(out ? out.slice(0, out.length - 1) : ""));
  }
  input.end();

  return results;
}
