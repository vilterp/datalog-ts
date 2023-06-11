import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { int, rec } from "../../core/types";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { runDDTestAtPath } from "../../util/ddTest";
import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";
import { range } from "../../util/util";
import { compileBasicBlocks } from "./compiler";

export function raceDetectorTests(writeResults: boolean): Suite {
  return [
    // {
    //   name: "execution",
    //   test() {
    //     runDDTestAtPath(
    //       "apps/raceDetector/testdata/execution.dd.txt",
    //       getResults,
    //       writeResults
    //     );
    //   },
    // },
    {
      name: "compiler",
      test() {
        runDDTestAtPath(
          "apps/raceDetector/testdata/compiler.dd.txt",
          compilerTest,
          writeResults
        );
      },
    },
    {
      name: "endToEnd",
      test() {
        runDDTestAtPath(
          "apps/raceDetector/testdata/endToEnd.dd.txt",
          endToEndTest,
          writeResults
        );
      },
    },
  ];
}

function getResults(inputs: string[]): TestOutput[] {
  let interp: AbstractInterpreter = new IncrementalInterpreter(
    "apps/raceDetector",
    fsLoader
  );
  interp = interp.doLoad("execution.dl");
  const out: TestOutput[] = [];
  inputs.forEach((input) => {
    const [results, newInterp] = interp.evalStr(input);
    interp = newInterp;
    out.push(datalogOut(results.map((res) => res.term)));
  });
  return out;
}

function compilerTest(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    const main = parseMain(input);
    const records = compileBasicBlocks(main);
    return datalogOut(records);
  });
}

function endToEndTest(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    const lines = input.split("\n");
    const allButLast = lines.slice(0, lines.length - 1).join("\n");
    const lastLine = lines[lines.length - 1];
    const main = parseMain(allButLast);
    const records = compileBasicBlocks(main);
    let interp: AbstractInterpreter = new IncrementalInterpreter(
      "apps/raceDetector",
      fsLoader
    );
    interp = interp.doLoad("execution.dl");
    interp = interp.bulkInsert(records);
    interp = interp.bulkInsert(
      range(30).map((n) => rec("time", { time: int(n) }))
    );
    const out = interp.queryStr(lastLine).map((x) => x.term);
    return datalogOut(out);
  });
}
