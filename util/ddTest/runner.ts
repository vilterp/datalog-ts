import {
  assertDeepEqual,
  assertStringEqual,
  Suite,
} from "../testBench/testing";
import fs from "fs";
import { zip } from "../util";
import { parseDDTest } from "./parser";
import { ProcessFn, Result, resultsToStr } from "./types";
import { jsonEq } from "../json";

function checkResults(results: Result[]) {
  // TODO: print 'em all out, not just first that failed
  for (const result of results) {
    assertStringEqual(result.pair.output.mimeType, result.actual.mimeType, {
      msg: `mime type not equal at line ${result.pair.lineNo}`,
    });
    assertStringEqual(result.pair.output.content, result.actual.content, {
      msg: `output not equal at line ${result.pair.lineNo}`,
    });
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

type ResultGetter = {
  getResults: ProcessFn;
  name: string;
};

export function runDDTestAtPathTwoVariants(
  path: string,
  leftGetter: ResultGetter,
  rightGetter: ResultGetter,
  writeResults: boolean
) {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  // TODO: DRY up
  const leftOutputs = leftGetter.getResults(test.map((t) => t.input));
  const rightOutputs = rightGetter.getResults(test.map((t) => t.input));
  const leftResults = zip(test, leftOutputs, (pair, actual) => ({
    pair,
    actual,
  }));
  const rightResults = zip(test, rightOutputs, (pair, actual) => ({
    pair,
    actual,
  }));
  const leftStr = resultsToStr(leftResults);
  const rightStr = resultsToStr(rightResults);
  assertStringEqual(leftStr, rightStr, {
    expectedName: leftGetter.name,
    actualName: rightGetter.name,
  });
  if (writeResults) {
    doWriteResults(path, leftResults);
  } else {
    checkResults(leftResults);
  }
}
