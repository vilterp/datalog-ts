import { fsLoader } from "../core/fsLoader";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { InterpCache, addCursor } from "./interpCache";
import { TestOutput } from "../util/ddTest";
import {
  runDDTestAtPath,
  runDDTestAtPathTwoVariants,
} from "../util/ddTest/runner";
import { datalogOut, plainTextOut } from "../util/ddTest/types";
import * as fs from "fs";
import { Suite } from "../util/testBench/testing";
import { LanguageSpec, dl } from "./common/types";
import { IncrementalInterpreter } from "../core/incremental/interpreter";
import { compile } from "./languages/dl2/compile";
import { extractModule } from "./languages/dl2/extract";
import { parseMain } from "./languages/dl2/parser";
import { ppRule } from "../core/pretty";
import { AbstractInterpreter } from "../core/abstractInterpreter";
import { instantiate } from "./languages/dl2/instantiate";

const BASE_PATH = "languageWorkbench/common";

const SIMPLE_CACHE = new InterpCache(
  () => new SimpleInterpreter(BASE_PATH, fsLoader)
);
const INCR_CACHE = new InterpCache(
  () => new IncrementalInterpreter(BASE_PATH, fsLoader)
);

export function lwbTests(writeResults: boolean): Suite {
  return [
    "fp",
    "sql",
    "dl",
    "dl2",
    "grammar",
    "modelica",
    "treeSQL",
    "basicBlocks",
    "contracts",
    "opt",
  ].map((lang) => ({
    name: lang,
    test() {
      runDDTestAtPathTwoVariants(
        `languageWorkbench/languages/${lang}/${lang}.dd.txt`,
        {
          name: "simple",
          getResults: (test) => testLangQuery(test, SIMPLE_CACHE),
        },
        {
          name: "incremental",
          getResults: (test) => testLangQuery(test, INCR_CACHE),
        },
        writeResults
      );
    },
  }));
}

export function dl2Tests(writeResults: boolean): Suite {
  return [
    {
      name: "compile",
      test() {
        runDDTestAtPath(
          `languageWorkbench/languages/dl2/compile.dd.txt`,
          dl2CompileTest,
          writeResults
        );
      },
    },
    {
      name: "run",
      test() {
        runDDTestAtPath(
          `languageWorkbench/languages/dl2/run.dd.txt`,
          dl2RunTest,
          writeResults
        );
      },
    },
  ];
}

function dl2CompileTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const parsed = parseMain(input);
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

    let interp: AbstractInterpreter = new SimpleInterpreter(
      BASE_PATH,
      fsLoader
    );

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

export function testLangQuery(
  test: string[],
  cache: InterpCache
): TestOutput[] {
  const output = test.map((input) => {
    const lines = input.split("\n");
    const langName = lines[0];
    const exampleWithCursor = lines.slice(1, lines.length - 1).join("\n");
    const { input: example, cursorPos } = extractCursor(exampleWithCursor);
    const query = lines[lines.length - 1];
    const langSpec: LanguageSpec = {
      name: langName,
      logic: dl(
        fs.readFileSync(
          `languageWorkbench/languages/${langName}/${langName}.dl`,
          "utf8"
        )
      ),
      grammar: fs.readFileSync(
        `languageWorkbench/languages/${langName}/${langName}.grammar`,
        "utf8"
      ),
      example: "",
    };
    const { interp: withoutCursor } = cache.getInterpForDoc(
      langName,
      { [langName]: langSpec },
      `test.${langName}`,
      example
    );
    const finalInterp = addCursor(withoutCursor, cursorPos);
    try {
      const results = finalInterp.queryStr(query);
      cache.clear();
      return datalogOut(results.map((res) => res.term));
    } catch (e) {
      console.log(e);
      throw new Error(`failed on input "${input}"`);
    }
  });
  return output;
}

const CURSOR = "|||";

export function extractCursor(input: string): {
  input: string;
  cursorPos: number;
} {
  const split = input.split(CURSOR, 2);
  if (split.length === 1) {
    return { input, cursorPos: 1 };
  }
  return { input: split[0] + split[1], cursorPos: split[0].length };
}
