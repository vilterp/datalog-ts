import { assertStringEqual } from "../../testing";
import fs from "fs";
import { zip } from "../../util";
import { parseDDTest } from "./parser";
import { ProcessFn, Result, resultsToStr } from "./types";

function checkResults(results: Result[]) {
  // TODO: print 'em all out, not just first that failed
  for (const result of results) {
    assertStringEqual(
      result.pair.output.content,
      result.actual.content,
      `L${result.pair.lineNo}: ${result.pair.input}`
    );
    assertStringEqual(
      result.pair.output.mimeType,
      result.actual.mimeType,
      `L${result.pair.lineNo}: ${result.pair.input}`
    );
  }
}

function doWriteResults(path: string, results: Result[]) {
  const str = resultsToStr(results);
  fs.writeFileSync(path, str);
}

export function runDDTestAtPath(
  path: string,
  getResults: ProcessFn,
  writeResults: boolean
) {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  const outputs = getResults(test);
  const results = zip(test, outputs, (pair, actual) => ({ pair, actual }));
  if (writeResults) {
    doWriteResults(path, results);
  } else {
    checkResults(results);
  }
}
