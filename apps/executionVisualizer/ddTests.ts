import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { int, rec } from "../../core/types";
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

function sliderTest(inputs: string[]): TestOutput[] {
  const output: TestOutput[] = [];
  let state = getInitialState();
  inputs.forEach((input) => {
    const lines = input.split("\n");
    const firstLine = lines[0];
    const allButFirst = lines.slice(1).join("\n");
    const { state: newState, output: newOutput } = processCommand(
      state,
      firstLine,
      allButFirst
    );
    state = newState;
    output.push(newOutput);
  });
  return output;
}

type State = { interp: AbstractInterpreter; value: number };

function processCommand(
  state: State,
  command: string,
  input: string
): { state: State; output: TestOutput } {
  switch (command) {
    case "source": {
      const main = parseMain(input);
      const records = compileBasicBlocks(main);
      const interp = state.interp.bulkInsert(records);
      return {
        state: {
          ...state,
          interp,
        },
        output: datalogOut([]),
      };
    }
    case "slide": {
      const newValue = parseInt(input);
      const interp = state.interp.evalRawStmts([
        {
          type: "Delete",
          record: rec("input.solverParam", {
            // TODO: parameterize instr idx
            instrIdx: int(3),
            value: int(state.value),
          }),
        },
        {
          type: "Fact",
          record: rec("input.solverParam", {
            instrIdx: int(3),
            value: int(newValue),
          }),
        },
      ])[1];
      return {
        state: {
          ...state,
          value: newValue,
          interp,
        },
        output: datalogOut([]),
      };
    }
    case "query": {
      return {
        state,
        output: datalogOut(state.interp.queryStr(input).map((res) => res.term)),
      };
    }
    case "reset": {
      return {
        state: getInitialState(),
        output: datalogOut([]),
      };
    }
  }
}

function getInitialState(): State {
  let interp: AbstractInterpreter = new IncrementalInterpreter(
    "apps/executionVisualizer/dl",
    fsLoader
  );
  interp = interp.doLoad("main.dl");
  return {
    interp,
    value: 25,
  };
}
