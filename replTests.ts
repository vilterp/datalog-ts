import { Suite } from "./testing";
import { Repl } from "./repl";
import * as stream from "stream";
import { DDTest, Result, runDDTestAtPath } from "./util/dataDrivenTests";

const ddTestSuites = ["simple", "family", "recurse", "literals"];
// const ddTestSuites = ["family"];

export function replTests(writeResults: boolean): Suite {
  return ddTestSuites.map((name) => ({
    name,
    test() {
      runDDTestAtPath(`testdata/${name}.dd.txt`, putThroughRepl, writeResults);
    },
  }));
}

function putThroughRepl(test: DDTest): Result[] {
  const input = identityTransform();
  const output = identityTransform();
  const repl = new Repl(input, output, false, "");
  repl.run();

  const results: Result[] = [];

  for (const pair of test) {
    input.write(pair.input + "\n");

    const chunk = output.read(); // TODO: this seems to not always get everything. sigh.

    results.push({
      pair,
      actual: chunk ? chunk.toString() : "",
    });
  }
  input.end();

  return results;
}

function identityTransform(): stream.Transform {
  return new stream.Transform({
    transform(
      chunk: any,
      encoding: string,
      callback: (error?: Error | null, data?: any) => void
    ): void {
      callback(null, chunk);
    },
  });
}
