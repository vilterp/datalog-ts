import { ppt } from "../../core/pretty";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { LOADER } from "../../uiCommon/ide/datalogPowered/dl";
import { constructInterp } from "../../uiCommon/ide/datalogPowered/interp";
import { TestOutput } from "../../util/ddTest";
import { suiteFromDDTestsInDir } from "../../util/ddTest/runner";
import { datalogOut, jsonOut } from "../../util/ddTest/types";
import { EXAMPLES } from "./examples";

export function lwbTests(writeResults: boolean) {
  return suiteFromDDTestsInDir(
    "apps/languageWorkbench/testdata",
    writeResults,
    [["fp", testLangQuery]]
  );
}

const initInterp = new SimpleInterpreter(".", LOADER);

function testLangQuery(test: string[]): TestOutput[] {
  return test.map((input) => {
    const [lang, example, query] = input.split("\n");
    const langObj = EXAMPLES[lang];
    const { finalInterp, allGrammarErrors, dlErrors, langParseError } =
      constructInterp({
        cursorPos: 1,
        dlSource: langObj.datalog,
        grammarSource: langObj.grammar,
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
