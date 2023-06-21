import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { runDDTestAtPath } from "../../util/ddTest";
import { datalogOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";
import { compileBasicBlocks } from "./compiler";

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
          endToEndTest,
          writeResults
        );
      },
    },
  ];
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
      "apps/executionVisualizer/dl",
      fsLoader
    );
    interp = interp.doLoad("main.dl");
    interp = interp.bulkInsert(records);
    const out = interp.queryStr(lastLine).map((x) => x.term);
    return datalogOut(out);
  });
}
