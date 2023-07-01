import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { int, rec } from "../../core/types";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { runDDTestAtPath } from "../../util/ddTest";
import { runDDTestAtPathTwoVariants } from "../../util/ddTest/runner";
import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";
import { compileBasicBlocksDL } from "./compileToDL";
import { stepAndRecord } from "./stepAndRecord";

export function executionVisualizerTests(writeResults: boolean): Suite {
  return [
    {
      name: "compiler",
      test() {
        runDDTestAtPath(
          "apps/executionVisualizer/testdata/compiler.dd.txt",
          compilerTest,
          writeResults
        );
      },
    },
    {
      name: "endToEnd",
      test() {
        runDDTestAtPath(
          "apps/executionVisualizer/testdata/endToEnd.dd.txt",
          endToEndTestDL,
          writeResults
        );
      },
    },
    {
      name: "slider",
      test() {
        runDDTestAtPath(
          "apps/executionVisualizer/testdata/slider.dd.txt",
          sliderTest,
          writeResults
        );
      },
    },
    {
      name: "endToEndBoth",
      test() {
        runDDTestAtPathTwoVariants(
          "apps/executionVisualizer/testdata/endToEndBoth.dd.txt",
          { name: "datalog", getResults: endToEndTestDL },
          { name: "imperative", getResults: endToEndTestImperative },
          writeResults
        );
      },
    },
  ];
}

function compilerTest(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    const main = parseMain(input);
    const records = compileBasicBlocksDL(main);
    return datalogOut(records);
  });
}

function endToEndTestDL(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    const lines = input.split("\n");
    const allButLast = lines.slice(0, lines.length - 1).join("\n");
    const lastLine = lines[lines.length - 1];
    const main = parseMain(allButLast);
    const records = compileBasicBlocksDL(main);
    let interp: AbstractInterpreter = new IncrementalInterpreter(
      "apps/executionVisualizer/dl",
      fsLoader
    );
    interp = interp.doLoad("main.dl");
    interp = interp.bulkInsert(records);
    const out = interp.queryStr(lastLine).map((x) => x.term);
    return datalogOut(out);
  });
}

function endToEndTestImperative(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    const lines = input.split("\n");
    const allButLast = lines.slice(0, lines.length - 1).join("\n");
    const lastLine = lines[lines.length - 1];
    const initInterp: AbstractInterpreter = new IncrementalInterpreter(
      "apps/executionVisualizer/dl",
      fsLoader
    );
    const [state, interp, error] = stepAndRecord(initInterp, allButLast);
    const out = interp.queryStr(lastLine).map((x) => x.term);
    return datalogOut(out);
  });
}

function sliderTest(inputs: string[]): TestOutput[] {
  const output: TestOutput[] = [];
  let interp: AbstractInterpreter = new IncrementalInterpreter(
    "apps/executionVisualizer/dl",
    fsLoader
  );
  interp = interp.doLoad("main.dl");
  let oldValue = 25;
  inputs.forEach((input) => {
    const lines = input.split("\n");
    const firstLine = lines[0];
    const allButFirst = lines.slice(1).join("\n");
    switch (firstLine) {
      case "source": {
        const main = parseMain(allButFirst);
        const records = compileBasicBlocksDL(main);
        interp = interp.bulkInsert(records);
        output.push(datalogOut([]));
        break;
      }
      case "slide": {
        const newValue = parseInt(allButFirst);
        interp = interp.evalRawStmts([
          {
            type: "Delete",
            record: rec("input.param", {
              // TODO: parameterize instr idx
              instrIdx: int(3),
              value: int(oldValue),
            }),
          },
          {
            type: "Fact",
            record: rec("input.param", {
              instrIdx: int(3),
              value: int(newValue),
            }),
          },
        ])[1];
        oldValue = newValue;
        output.push(datalogOut([]));
        break;
      }
      case "query": {
        output.push(
          datalogOut(interp.queryStr(allButFirst).map((res) => res.term))
        );
        break;
      }
    }
  });
  return output;
}
