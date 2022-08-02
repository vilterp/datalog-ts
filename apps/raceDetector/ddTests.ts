import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { ppt } from "../../core/pretty";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { runDDTestAtPath } from "../../util/ddTest";
import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";

export function raceDetectorTests(writeResults: boolean): Suite {
  return [
    {
      name: "raceDetector",
      test() {
        runDDTestAtPath(
          "apps/raceDetector/basic.dd.txt",
          getResults,
          writeResults
        );
      },
    },
  ];
}

function getResults(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    let interp: AbstractInterpreter = new SimpleInterpreter(
      "apps/raceDetector",
      fsLoader
    );
    interp = interp.doLoad("basic.dl");
    interp = interp.evalStr(input)[1];
    const results = interp.queryStr("state{}");
    // TODO: datalogOut should take Res[] or Term[]
    return datalogOut(results.map((res) => ppt(res.term)).join(".\n"));
  });
}
