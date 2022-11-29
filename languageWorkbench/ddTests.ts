import { fsLoader } from "../core/fsLoader";
import { ppt } from "../core/pretty";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { addCursor, constructInterp } from "./interp";
import { TestOutput } from "../util/ddTest";
import { runDDTestAtPath } from "../util/ddTest/runner";
import { datalogOut, jsonOut } from "../util/ddTest/types";
import * as fs from "fs";
import { Suite } from "../util/testBench/testing";
import { LanguageSpec } from "./languages";
import { logAndClearRuleProfile } from "./parserlib/parser";

export function lwbTests(writeResults: boolean): Suite {
  return [
    "fp",
    "sql",
    "dl",
    "grammar",
    "modelica",
    "treeSQL",
    "basicBlocks",
    "contracts",
  ].map((lang) => ({
    name: lang,
    test() {
      runDDTestAtPath(
        `languageWorkbench/languages/${lang}/${lang}.dd.txt`,
        testLangQuery,
        writeResults
      );
    },
  }));
}

const INIT_INTERP = new SimpleInterpreter(
  "languageWorkbench/commonDL",
  fsLoader
);

export function testLangQuery(test: string[]): TestOutput[] {
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
    const {
      interp: withoutCursor,
      allGrammarErrors,
      dlErrors,
      langParseError,
    } = constructInterp(INIT_INTERP, langSpec, example);
    const finalInterp = addCursor(withoutCursor, cursorPos);
    if (allGrammarErrors.length > 0 || dlErrors.length > 0 || langParseError) {
      return jsonOut({ allGrammarErrors, langParseError, dlErrors });
    }
    logAndClearRuleProfile();
    try {
      const res = finalInterp.queryStr(query);
      return datalogOut(res.map((res) => res.term));
    } catch (e) {
      console.log(e);
      throw new Error(`failed on input "${input}"`);
    }
  });
}

const CURSOR = "|||";

function extractCursor(input: string): { input: string; cursorPos: number } {
  const split = input.split(CURSOR, 2);
  if (split.length === 1) {
    return { input, cursorPos: 1 };
  }
  return { input: split[0] + split[1], cursorPos: split[0].length };
}
