import { fsLoader } from "../core/fsLoader";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { addCursor, clearInterpCache, getInterpForDoc } from "./interpCache";
import { TestOutput } from "../util/ddTest";
import { runDDTestAtPath } from "../util/ddTest/runner";
import { datalogOut } from "../util/ddTest/types";
import * as fs from "fs";
import { Suite } from "../util/testBench/testing";
import { LanguageSpec } from "./common/types";
import { IncrementalInterpreter } from "../core/incremental/interpreter";
import { AbstractInterpreter } from "../core/abstractInterpreter";

export function lwbTestsSimple(writeResults: boolean) {
  return lwbTests(
    writeResults,
    new SimpleInterpreter("languageWorkbench/common", fsLoader)
  );
}

export function lwbTestsIncr(writeResults: boolean) {
  return lwbTests(
    writeResults,
    new IncrementalInterpreter("languageWorkbench/common", fsLoader),
    new Set(["contracts"])
  );
}

function lwbTests(
  writeResults: boolean,
  initInterp: AbstractInterpreter,
  exclude: Set<string> = new Set<string>()
): Suite {
  return [
    "fp",
    "sql",
    "dl",
    "grammar",
    "modelica",
    "treeSQL",
    "basicBlocks",
    "contracts",
  ]
    .filter((lang) => !exclude.has(lang))
    .map((lang) => ({
      name: lang,
      test() {
        runDDTestAtPath(
          `languageWorkbench/languages/${lang}/${lang}.dd.txt`,
          (test) => testLangQuery(test, initInterp),
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
  return test.map((input) => {
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
      const res = finalInterp.queryStr(query);
      return datalogOut(res.map((res) => res.term));
    } catch (e) {
      console.log(e);
      throw new Error(`failed on input "${input}"`);
    } finally {
      clearInterpCache();
    }
  });
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
