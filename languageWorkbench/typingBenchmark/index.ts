import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { numFacts } from "../../core/incremental/catalog";
import { toGraphviz } from "../../core/incremental/graphviz";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { formatOutput as formatIncrOutput } from "../../core/incremental/output";
import { parserTermToInternal } from "../../core/translateAST";
import { int, Int, rec, Rec } from "../../core/types";
import { runDDTestAtPath, TestOutput } from "../../util/ddTest";
import { graphvizOut, plainTextOut } from "../../util/ddTest/types";
import { prettyPrintGraph } from "../../util/graphviz";
import { assert, Suite } from "../../util/testBench/testing";
import { LanguageSpec } from "../common/types";
import { LANGUAGES } from "../languages";
import { parseRecord } from "../languages/dl/parser";
import { parseMain } from "../languages/grammar/parser";
import { declareTables, flatten, getUnionRule } from "../parserlib/flatten";
import { parse } from "../parserlib/parser";
import { extractRuleTree } from "../parserlib/ruleTree";
import { parserGrammarToInternal } from "../parserlib/translateAST";
import { ensureRequiredRelations } from "../requiredRelations";

export function lwbTypingTests(writeResults: boolean): Suite {
  return [
    {
      name: "dl",
      test() {
        return runDDTestAtPath(
          "languageWorkbench/typingBenchmark/dlTyping.dd.txt",
          (test) => typingTest(LANGUAGES.datalog, test),
          writeResults
        );
      },
    },
  ];
}

function typingTest(langSpec: LanguageSpec, test: string[]): TestOutput[] {
  const out: TestOutput[] = [];

  // initialize the interpreter for this language
  let interp: AbstractInterpreter = new IncrementalInterpreter(
    "languageWorkbench/common",
    fsLoader
  );
  interp = interp.doLoad("main.dl");

  // load this language spec
  const grammarTree = parseMain(langSpec.grammar);
  const grammar = parserGrammarToInternal(grammarTree);
  interp = interp.evalStr(langSpec.datalog)[1];

  interp = interp.evalRawStmts(declareTables(grammar))[1];
  interp = interp.evalStmt({
    type: "Rule",
    rule: getUnionRule(grammar),
  })[1];
  interp = ensureRequiredRelations(interp);

  // demand a relation to ensure the graph gets built
  interp = interp.evalStr("tc.Problem{}?")[1];
  assert((interp as IncrementalInterpreter).graph !== null, "graph not null");

  // insert the initial source
  const source = test[0];
  const traceTree = parse(grammar, "main", source);
  const ruleTree = extractRuleTree(traceTree);
  const records = flatten(ruleTree, source);
  interp = interp.bulkInsert(records);

  let lastCursor = 1;
  interp = interp.evalStr("ide.Cursor{idx: 1}.")[1];

  out.push(
    plainTextOut(
      `${numFacts((interp as IncrementalInterpreter).catalog)} facts inserted`
    )
  );

  for (const edit of test.slice(1)) {
    if (edit === "ruleGraph") {
      out.push(
        graphvizOut(
          prettyPrintGraph(toGraphviz((interp as IncrementalInterpreter).graph))
        )
      );
    } else if (edit === "removeCursor") {
      // delete old cursor
      const { newInterp, output } = (
        interp as IncrementalInterpreter
      ).processStmt({
        type: "Delete",
        record: rec("ide.Cursor", { idx: int(lastCursor) }),
      });
      out.push(
        formatIncrOutput((newInterp as IncrementalInterpreter).graph, output, {
          emissionLogMode: "test",
          filterEmpties: true,
        })
      );
      interp = newInterp;
    } else {
      // insert new cursor
      const rawRec = parseRecord(edit);
      const inputRec = parserTermToInternal(rawRec);
      const newCursor = ((inputRec as Rec).attrs.idx as Int).val;

      const { newInterp, output } = (
        interp as IncrementalInterpreter
      ).processStmt({
        type: "Fact",
        record: rec("ide.Cursor", { idx: int(newCursor) }),
      });
      out.push(
        formatIncrOutput((newInterp as IncrementalInterpreter).graph, output, {
          emissionLogMode: "test",
          filterEmpties: true,
        })
      );
      lastCursor = newCursor;
      interp = newInterp;
    }
  }

  return out;
}
