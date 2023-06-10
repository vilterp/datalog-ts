import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { runDDTestAtPath } from "../../util/ddTest";
import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";
import { compileBasicBlocks } from "./compiler";

export function raceDetectorTests(writeResults: boolean): Suite {
  return [
    {
      name: "raceDetector",
      test() {
        runDDTestAtPath(
          "apps/raceDetector/testdata/execution.dd.txt",
          getResults,
          writeResults
        );
      },
    },
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
