import { Suite } from "../util/testing";
import { runDDTestAtPath, DDTest } from "../util/ddTest";
import { Grammar, seq, text, choice } from "./grammar";
import { parse, TraceTree } from "./parser";
import { jsonGrammar } from "./examples/json";
import { digit, intLit, stringLit } from "./stdlib";
import { extractRuleTree } from "./ruleTree";
import { ruleTreeToTree, prettyPrintRuleTree } from "./pretty";
import { metaGrammar, extractGrammar } from "./meta";
import { datalogOut, plainTextOut, TestOutput } from "../util/ddTest/types";
import { grammarToDL, inputToDL } from "./genDatalog";
import { ppRule, ppt } from "../pretty";
import { suiteFromDDTestsInDir } from "../util/ddTest/runner";

// TODO: rename to stdlibGrammar? :P
const basicGrammar: Grammar = {
  abcSeq: seq([text("a"), text("b"), text("c")]),
  abcChoice: choice([text("a"), text("b"), text("c")]),
  digit: digit,
  intLit: intLit,
  stringLit: stringLit,
  intOrString: choice([intLit, stringLit]),
};

export function parserlibTests(writeResults: boolean): Suite {
  return suiteFromDDTestsInDir("parserlib/testdata", writeResults, [
    ["basic", (t) => parserTest(basicGrammar, t)],
    ["json", (t) => parserTestFixedStartRule(jsonGrammar, "value", t)],
    ["meta", metaTest],
    ["dlgen", dlGenTest],
    ["inputgen", inputGenTest],
  ]);
}

// TODO: DRY these two up
function parserTest(grammar: Grammar, test: string[]): TestOutput[] {
  return test.map((input) => {
    const lines = input.split("\n");
    const tree = parse(grammar, lines[0], lines.slice(1).join("\n"));
    return handleResults(tree);
  });
}

function metaTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const traceTree = parse(metaGrammar, "grammar", input);
    const ruleTree = extractRuleTree(traceTree);
    const grammar = extractGrammar(input, ruleTree);
    // TODO: indicate that it's one after the other...
    return plainTextOut(
      prettyPrintRuleTree(ruleTree) + "\n" + JSON.stringify(grammar, null, 2)
    );
  });
}

function parserTestFixedStartRule(
  grammar: Grammar,
  startRule: string,
  test: string[]
): TestOutput[] {
  return test.map((input) => {
    const tree = parse(grammar, startRule, input);
    return handleResults(tree);
  });
}

function handleResults(tree: TraceTree): TestOutput {
  const ruleTree = extractRuleTree(tree);
  return plainTextOut(prettyPrintRuleTree(ruleTree));
}

function dlGenTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const traceTree = parse(metaGrammar, "grammar", input);
    const ruleTree = extractRuleTree(traceTree);
    const grammar = extractGrammar(input, ruleTree);
    const rules = grammarToDL(grammar);
    return datalogOut(rules.map(ppRule).join("\n"));
  });
}

function inputGenTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    return datalogOut(
      inputToDL(input)
        .map((t) => ppt(t) + ".")
        .join("\n")
    );
  });
}
