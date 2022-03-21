import { fsLoader } from "../../core/fsLoader";
import { ppt } from "../../core/pretty";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { constructInterp } from "../../uiCommon/ide/datalogPowered/interp";
import { TestOutput } from "../../util/ddTest";
import { runDDTestAtPath } from "../../util/ddTest/runner";
import { datalogOut, jsonOut } from "../../util/ddTest/types";
import * as fs from "fs";
import { Suite } from "../../util/testBench/testing";

export function lwbTests(writeResults: boolean): Suite {
  return ["fp", "sql", "dl", "grammar"].map((lang) => ({
    name: lang,
    test() {
      runDDTestAtPath(
        `apps/languageWorkbench/examples/${lang}/${lang}.dd.txt`,
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

function testLangQuery(test: string[]): TestOutput[] {
  return test.map((input) => {
    const lines = input.split("\n");
    const lang = lines[0];
    const example = lines.slice(1, lines.length - 1).join("\n");
    const query = lines[lines.length - 1];
    const { finalInterp, allGrammarErrors, dlErrors, langParseError } =
      constructInterp({
        cursorPos: 1,
        builtinSource: fs.readFileSync(
          "uiCommon/ide/datalogPowered/dl/main.dl",
          "utf8"
        ),
        dlSource: fs.readFileSync(
          `apps/languageWorkbench/examples/${lang}/${lang}.dl`,
          "utf8"
        ),
        grammarSource: fs.readFileSync(
          `apps/languageWorkbench/examples/${lang}/${lang}.grammar`,
          "utf8"
        ),
        langSource: example,
        initInterp,
      });
    const res = finalInterp.queryStr(query);
    if (allGrammarErrors.length > 0 || dlErrors.length > 0 || langParseError) {
      return jsonOut({ allGrammarErrors, langParseError, dlErrors });
    }
    return datalogOut(res.map((res) => ppt(res.term)).join("\n"));
  });
}
