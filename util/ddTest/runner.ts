import { assertStringEqual, Suite } from "../testBench/testing";
import fs from "fs";
import { zip } from "../util";
import { parseDDTest } from "./parser";
import { ProcessFn, Result, resultsToStr, TestOutput } from "./types";

function checkResults(results: Result[]) {
  // TODO: print 'em all out, not just first that failed
  for (const result of results) {
    assertStringEqual(
      result.pair.output.mimeType,
      result.actual.mimeType,
      `mime type not equal at line ${result.pair.lineNo}`
    );
    assertStringEqual(
      result.pair.output.content,
      result.actual.content,
      `output not equal at line ${result.pair.lineNo}`
    );
  }
}

function doWriteResults(path: string, results: Result[]) {
  const str = resultsToStr(results);
  fs.writeFileSync(path, str);
}

export function suiteFromDDTestsInDir(
  dir: string,
  writeResults: boolean,
  tests: [string, ProcessFn][]
): Suite {
  return tests.map(([name, fn]) => ({
    name,
    test() {
      runDDTestAtPath(`${dir}/${name}.dd.txt`, fn, writeResults);
    },
  }));
}

export function runDDTestAtPath(
  path: string,
  getResults: ProcessFn,
  writeResults: boolean
) {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  const outputs = getResults(test.map((t) => t.input));
  const results = zip(test, outputs, (pair, actual) => ({ pair, actual }));
  if (writeResults) {
    doWriteResults(path, results);
  } else {
    checkResults(results);
  }
}

export function runDDTestAtPathWithVariants(
  path: string,
  variants: { [name: string]: ProcessFn },
  writeResults: boolean
) {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  const resultsByVariant: { [name: string]: TestOutput[] } = {};
  for (const variant in variants) {
    const getResults = variants[variant];
    resultsByVariant[variant] = getResults(test.map((t) => t.input));
  }
  test.forEach((input, idx) => {
    for (const variant in variants) {
      const output = resultsByVariant[variant][idx];
    }
  });
}
