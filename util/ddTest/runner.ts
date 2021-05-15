import { assert, assertStringEqual, Suite } from "../testing";
import fs from "fs";
import { setEq, zip } from "../util";
import { parseDDTest } from "./parser";
import { ProcessFn, Result, resultsToStr } from "./types";

function checkResults(
  results: Result[],
  resultEqualityMode: ResultEqualityMode
) {
  // TODO: print 'em all out, not just first that failed
  for (const result of results) {
    assertStringEqual(
      result.pair.output.mimeType,
      result.actual.mimeType,
      `L${result.pair.lineNo}: ${result.pair.input}`
    );
    switch (resultEqualityMode) {
      case "literal":
        assertStringEqual(
          result.pair.output.content,
          result.actual.content,
          `L${result.pair.lineNo}: ${result.pair.input}`
        );
        break;
      case "lineOrderIndependent": {
        const exp = result.pair.output.content;
        const actual = result.actual.content;
        assert(
          lineSetEq(exp, actual),
          exp,
          actual,
          `results must be order-independent equal`
        );
      }
    }
    if (resultEqualityMode === "literal") {
      assertStringEqual(
        result.pair.output.content,
        result.actual.content,
        `L${result.pair.lineNo}: ${result.pair.input}`
      );
    } else {
    }
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

type ResultEqualityMode = "literal" | "lineOrderIndependent";

export function runDDTestAtPath(
  path: string,
  getResults: ProcessFn,
  writeResults: boolean,
  resultEquality: ResultEqualityMode = "literal"
) {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  const outputs = getResults(test.map((t) => t.input));
  const results = zip(test, outputs, (pair, actual) => ({ pair, actual }));
  if (writeResults) {
    doWriteResults(path, results);
  } else {
    checkResults(results, resultEquality);
  }
}

function lineSetEq(left: string, right: string) {
  const leftLines = new Set(left.split("\n"));
  const rightLines = new Set(right.split("\n"));

  return setEq(leftLines, rightLines);
}
