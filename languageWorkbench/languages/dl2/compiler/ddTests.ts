import { AbstractInterpreter } from "../../../../core/abstractInterpreter";
import { nullLoader } from "../../../../core/loaders";
import { ppRule } from "../../../../core/pretty";
import { SimpleInterpreter } from "../../../../core/simple/interpreter";
import { TestOutput, runDDTestAtPath } from "../../../../util/ddTest";
import { datalogOut, plainTextOut } from "../../../../util/ddTest/types";
import { Suite } from "../../../../util/testBench/testing";
import { ParseErrors } from "../../../parserlib/types";
import { compile } from "./compile";
import { extractModule } from "./extract";
import { instantiate } from "./instantiate";
import { parseMain } from "../parser";

export function dl2Tests(writeResults: boolean): Suite {
  return [
    {
      name: "compile",
      test() {
        runDDTestAtPath(
          `languageWorkbench/languages/dl2/compiler/compile.dd.txt`,
          dl2CompileTest,
          writeResults
        );
      },
    },
    {
      name: "run",
      test() {
        runDDTestAtPath(
          `languageWorkbench/languages/dl2/compiler/run.dd.txt`,
          dl2RunTest,
          writeResults
        );
      },
    },
  ];
}

function dl2CompileTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const [parsed, parseProblems] = parseMain(input);
    if (parseProblems.length > 0) {
      throw new ParseErrors(parseProblems);
    }
    const [mod, extractProblems] = extractModule(parsed);
    if (extractProblems.length > 0) {
      throw new Error(`extract problems: ${extractProblems}`);
    }
    const [compiled, compileProblems] = compile(mod);
    if (compileProblems.length > 0) {
      throw new Error(`compile problems: ${compileProblems}`);
    }
    return plainTextOut(Object.values(compiled).map(ppRule).join("\n\n"));
  });
}

function dl2RunTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    // Get input
    const lines = input.split("\n");
    const decls = lines.slice(0, lines.length - 1).join("\n");
    const query = lines[lines.length - 1];

    let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);

    // TODO: get parse problems
    const [newInterp, problems] = instantiate(interp, decls);
    if (problems.length > 0) {
      throw new Error(`problems: ${problems}`);
    }
    interp = newInterp;

    // Query
    const res = interp.queryStr(query);
    return datalogOut(res.map((res) => res.term));
  });
}
