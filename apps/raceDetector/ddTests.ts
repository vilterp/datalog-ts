import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { runDDTestAtPath } from "../../util/ddTest";
import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";

export function raceDetectorTests(writeResults: boolean): Suite {
  return [
    {
      name: "raceDetector",
      test() {
        runDDTestAtPath(
          "apps/raceDetector/execution.dd.txt",
          getResults,
          writeResults
        );
      },
    },
  ];
}

function getResults(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    let interp: AbstractInterpreter = new IncrementalInterpreter(
      "apps/raceDetector",
      fsLoader
    );
    interp = interp.doLoad("execution.dl");
    const results = interp.evalStr(input)[0];
    return datalogOut(results.map((res) => res.term));
  });
}
