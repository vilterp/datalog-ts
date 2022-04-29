import { fsLoader } from "../../../core/fsLoader";
import { ppt } from "../../../core/pretty";
import { SimpleInterpreter } from "../../../core/simple/interpreter";
import { addCursor, constructInterp } from "./interp";
import { TestOutput } from "../../../util/ddTest";
import { runDDTestAtPath } from "../../../util/ddTest/runner";
import { datalogOut, jsonOut } from "../../../util/ddTest/types";
import * as fs from "fs";
import { Suite } from "../../../util/testBench/testing";

export function lwbTests(writeResults: boolean): Suite {
  return ["fp", "sql", "dl", "grammar"].map((lang) => ({
    name: lang,
    test() {
      runDDTestAtPath(
        `uiCommon/ide/datalogPowered/languages/${lang}/${lang}.dd.txt`,
        testLangQuery,
        writeResults
      );
    },
  }));
}

const initInterp = new SimpleInterpreter(
  "uiCommon/ide/datalogPowered/dl",
  fsLoader
);

export function testLangQuery(test: string[]): TestOutput[] {
  return test.map((input) => {
    const lines = input.split("\n");
    const lang = lines[0];
    const exampleWithCursor = lines.slice(1, lines.length - 1).join("\n");
    const { input: example, cursorPos } = extractCursor(exampleWithCursor);
    const query = lines[lines.length - 1];
    const {
      finalInterp: withoutCursor,
      allGrammarErrors,
      dlErrors,
      langParseError,
    } = constructInterp({
      builtinSource: fs.readFileSync(
        "uiCommon/ide/datalogPowered/dl/main.dl",
        "utf8"
      ),
      dlSource: fs.readFileSync(
        `uiCommon/ide/datalogPowered/languages/${lang}/${lang}.dl`,
        "utf8"
      ),
      grammarSource: fs.readFileSync(
        `uiCommon/ide/datalogPowered/languages/${lang}/${lang}.grammar`,
        "utf8"
      ),
      langSource: example,
      initInterp,
    });
    const finalInterp = addCursor(withoutCursor, cursorPos);
    const res = finalInterp.queryStr(query);
    if (allGrammarErrors.length > 0 || dlErrors.length > 0 || langParseError) {
      return jsonOut({ allGrammarErrors, langParseError, dlErrors });
    }
    return datalogOut(res.map((res) => ppt(res.term)).join("\n"));
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
