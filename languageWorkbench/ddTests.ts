import { fsLoader } from "../core/fsLoader";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { addCursor, clearInterpCache, getInterpForDoc } from "./interpCache";
import { TestOutput } from "../util/ddTest";
import { runDDTestAtPathTwoVariants } from "../util/ddTest/runner";
import { datalogOut } from "../util/ddTest/types";
import * as fs from "fs";
import { Suite } from "../util/testBench/testing";
import { LanguageSpec } from "./common/types";
import { IncrementalInterpreter } from "../core/incremental/interpreter";
import { AbstractInterpreter } from "../core/abstractInterpreter";

const BASE_PATH = "languageWorkbench/common";

export function lwbTests(writeResults: boolean): Suite {
  return [
    // "fp",
    // "sql",
    // "dl",
    // "grammar",
    // "modelica",
    // "treeSQL",
    "basicBlocks",
    // "contracts",
  ].map((lang) => ({
    name: lang,
    test() {
      runDDTestAtPathTwoVariants(
        `languageWorkbench/languages/${lang}/${lang}.dd.txt`,
        {
          name: "simple",
          getResults: (test) =>
            testLangQuery(test, new SimpleInterpreter(BASE_PATH, fsLoader)),
        },
        {
          name: "incremental",
          getResults: (test) =>
            testLangQuery(
              test,
              new IncrementalInterpreter(BASE_PATH, fsLoader)
            ),
        },
        writeResults
      );
      clearInterpCache();
    },
  }));
}

export function testLangQuery(
  test: string[],
  initInterp: AbstractInterpreter
): TestOutput[] {
  const output = test.map((input) => {
    const lines = input.split("\n");
    const langName = lines[0];
    const exampleWithCursor = lines.slice(1, lines.length - 1).join("\n");
    const { input: example, cursorPos } = extractCursor(exampleWithCursor);
    const query = lines[lines.length - 1];
    const langSpec: LanguageSpec = {
      name: langName,
      datalog: fs.readFileSync(
        `languageWorkbench/languages/${langName}/${langName}.dl`,
        "utf8"
      ),
      grammar: fs.readFileSync(
        `languageWorkbench/languages/${langName}/${langName}.grammar`,
        "utf8"
      ),
      example: "",
    };
    const { interp: withoutCursor } = getInterpForDoc(
      initInterp,
      langName,
      { [langName]: langSpec },
      `test.${langName}`,
      example
    );
    const finalInterp = addCursor(withoutCursor, cursorPos);
    try {
      const results = finalInterp.queryStr(query);
      return datalogOut(results.map((res) => res.term));
    } catch (e) {
      console.log(e);
      throw new Error(`failed on input "${input}"`);
    }
  });
  clearInterpCache();
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
