import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { numFacts } from "../../core/incremental/catalog";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { runDDTestAtPath, TestOutput } from "../../util/ddTest";
import { plainTextOut } from "../../util/ddTest/types";
import { assert, Suite } from "../../util/testBench/testing";
import { LanguageSpec } from "../common/types";
import { LANGUAGES } from "../languages";
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
  let interp: AbstractInterpreter = new IncrementalInterpreter(".", fsLoader);

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

  out.push(
    plainTextOut(
      `${numFacts((interp as IncrementalInterpreter).catalog)} facts inserted`
    )
  );

  for (const edit in test.slice(1)) {
    out.push(plainTextOut("edit"));
  }

  return out;
}