import { fsLoader } from "../../core/fsLoader";
import { ppt } from "../../core/pretty";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { constructInterp } from "../../uiCommon/ide/datalogPowered/interp";
import { TestOutput } from "../../util/ddTest";
import { suiteFromDDTestsInDir } from "../../util/ddTest/runner";
import { datalogOut, jsonOut } from "../../util/ddTest/types";
import * as fs from "fs";

export function lwbTests(writeResults: boolean) {
  return suiteFromDDTestsInDir(
    "apps/languageWorkbench/testdata",
    writeResults,
    [["fp", testLangQuery]]
  );
}

const initInterp = new SimpleInterpreter(
  "uiCommon/ide/datalogPowered/dl",
  fsLoader
);

function testLangQuery(test: string[]): TestOutput[] {
  return test.map((input) => {
    const [lang, example, query] = input.split("\n");
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
    if (allGrammarErrors || dlErrors || langParseError) {
      return jsonOut({ allGrammarErrors, langParseError, dlErrors });
    }
    return datalogOut(res.map((res) => ppt(res.term)).join("\n"));
  });
}
