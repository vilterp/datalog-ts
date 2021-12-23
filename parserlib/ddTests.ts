import { Suite } from "../util/testing";
import { runDDTestAtPath } from "../util/ddTest";
import { Grammar, seq, text, choice } from "./grammar";
import { parse, TraceTree } from "./parser";
import { jsonGrammar } from "./examples/json";
import { digit, intLit, stringLit } from "./stdlib";
import { extractRuleTree } from "./ruleTree";
import { prettyPrintRuleTree } from "./pretty";
import { metaGrammar, extractGrammar, parseGrammar } from "./meta";
import { datalogOut, plainTextOut, TestOutput } from "../util/ddTest/types";
import { flatten } from "./flatten";
import { ppr, ppRule, ppt } from "../core/pretty";
import { grammarToDL, inputToDL } from "./datalog/genDatalog";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { nullLoader } from "../core/loaders";
import { AbstractInterpreter } from "../core/abstractInterpreter";
import { Rule } from "../core/types";

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
  return [
    {
      name: "basic",
      test() {
        runDDTestAtPath(
          "parserlib/testdata/basic.dd.txt",
          (t) => parserTest(basicGrammar, t),
          writeResults
        );
      },
    },
    {
      name: "json",
      test() {
        runDDTestAtPath(
          "parserlib/testdata/json.dd.txt",
          (t) => parserTestFixedStartRule(jsonGrammar, "value", t),
          writeResults
        );
      },
    },
    {
      name: "meta",
      test() {
        runDDTestAtPath(
          "parserlib/testdata/meta.dd.txt",
          metaTest,
          writeResults
        );
      },
    },
    {
      name: "flatten",
      test() {
        runDDTestAtPath(
          "parserlib/testdata/flatten.dd.txt",
          flattenTest,
          writeResults
        );
      },
    },
    {
      name: "datalog",
      test() {
        runDDTestAtPath(
          "parserlib/testdata/datalog.dd.txt",
          datalogTest,
          writeResults
        );
      },
    },
    {
      name: "datalogInput",
      test() {
        runDDTestAtPath(
          "parserlib/testdata/datalogInput.dd.txt",
          datalogInputTest,
          writeResults
        );
      },
    },
  ];
}

// TODO: DRY these two up
function parserTest(grammar: Grammar, test: string[]): TestOutput[] {
  return test.map((input) => {
    const lines = input.split("\n");
    const parserInput = lines.slice(1).join("\n");
    const tree = parse(grammar, lines[0], parserInput);
    return handleResults(tree, parserInput);
  });
}

function metaTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const traceTree = parse(metaGrammar, "grammar", input);
    const ruleTree = extractRuleTree(traceTree);
    const grammar = extractGrammar(input, ruleTree);
    return plainTextOut(
      prettyPrintRuleTree(ruleTree, input) +
        "\n" +
        JSON.stringify(grammar, null, 2)
    );
  });
}

function flattenTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const traceTree = parse(jsonGrammar, "value", input);
    const ruleTree = extractRuleTree(traceTree);
    const flattened = flatten(ruleTree, input);
    return datalogOut(flattened.map(ppt).join("\n"));
  });
}

function datalogTest(test: string[]): TestOutput[] {
  let rules: Rule[] = [];
  return test.map((input) => {
    const lines = input.split("\n");
    const firstLine = lines[0];
    const restOfInput = lines.slice(1).join("\n");
    if (firstLine === "gram") {
      const grammarParsed = parseGrammar(restOfInput);
      rules = grammarToDL(grammarParsed);
      return datalogOut(rules.map(ppRule).join(".\n") + ".");
    } else if (firstLine === "input") {
      // TODO: bring back `initializeInterp` into this package; use here?
      let interp = new SimpleInterpreter(
        ".",
        nullLoader
      ) as AbstractInterpreter;
      // insert rules and tables
      interp = interp.evalStmts(
        rules.map((rule) => ({ type: "Rule", rule }))
      )[1];
      interp = interp.evalStmt({ type: "TableDecl", name: "next" })[1];
      interp = interp.evalStmt({ type: "TableDecl", name: "source" })[1];
      // insert input
      interp = interp.insertAll(inputToDL(restOfInput));
      try {
        const results = interp.queryStr("main{span: span{from: F, to: T}}");
        return datalogOut(results.map((res) => ppt(res.term) + ".").join("\n"));
      } catch (e) {
        throw new Error(`error on input "${restOfInput}": ${e}`);
      }
    } else {
      throw new Error(`expected 'gram' or 'input'; got ${firstLine}`);
    }
  });
}

function datalogInputTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    return datalogOut(
      inputToDL(input)
        .map((rec) => ppt(rec) + ".")
        .join("\n")
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
    return handleResults(tree, input);
  });
}

function handleResults(tree: TraceTree, source: string): TestOutput {
  const ruleTree = extractRuleTree(tree);
  return plainTextOut(prettyPrintRuleTree(ruleTree, source));
}
