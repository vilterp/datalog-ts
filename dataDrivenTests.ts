import { assertStringEqual, Suite } from "./testing";
import { Repl } from "./repl";
import * as stream from "stream";
import * as fs from "fs";

export function dataDrivenTests(writeResults: boolean): Suite {
  return [
    {
      name: "simple",
      test() {
        runDDTestAtPath("testdata/simple.dd.txt", writeResults);
      },
    },
    {
      name: "family",
      test() {
        runDDTestAtPath("testdata/family.dd.txt", writeResults);
      },
    },
  ];
}

type DDTest = IOPair[];

interface IOPair {
  lineNo: number; // 1-indexed
  input: string;
  output: string;
}

function checkResults(results: Result[]) {
  // TODO: print 'em all out, not just first that failed
  for (const result of results) {
    assertStringEqual(
      result.pair.output.trim(),
      result.actual.trim(),
      `L${result.pair.lineNo}: ${result.pair.input}`
    );
  }
}

function resultsToStr(results: Result[]): string {
  return results
    .map((r) => [r.pair.input, "----", r.actual].join("\n"))
    .join("\n");
}

function doWriteResults(path: string, results: Result[]) {
  fs.writeFileSync(path, resultsToStr(results));
}

function runDDTestAtPath(path: string, writeResults: boolean) {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  const results = getResults(test);
  if (writeResults) {
    doWriteResults(path, results);
  } else {
    checkResults(results);
  }
}

type Result = { pair: IOPair; actual: string };

function getResults(test: DDTest): Result[] {
  const input = identityTransform();
  const output = identityTransform();
  const repl = new Repl(input, output, false, "");
  repl.run();

  const results: Result[] = [];

  for (const pair of test) {
    console.log("writing", pair.input);
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

// ah, nothing like a hand written parser
function parseDDTest(str: string): DDTest {
  const out: DDTest = [];
  let lineNo = 1;
  let inputLineNo = 1;
  let state: "input" | "output" = "input";
  let curInput = [];
  let curOutput = [];
  for (const line of str.split("\n")) {
    if (state === "input") {
      if (line === "----") {
        inputLineNo = lineNo - 1;
        state = "output";
      } else {
        if (line !== "" && !line.startsWith("#")) {
          curInput.push(line);
        }
      }
    } else if (state === "output") {
      if (line === "") {
        out.push({
          lineNo: inputLineNo,
          input: curInput.join("\n"),
          output: curOutput.length === 0 ? "" : curOutput.join("\n") + "\n",
        });
        curOutput = [];
        curInput = [];
        state = "input";
      } else {
        curOutput.push(line);
      }
    }
    lineNo++;
  }
  return out;
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
