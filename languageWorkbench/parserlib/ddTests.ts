import { Suite } from "../../util/testBench/testing";
import { runDDTestAtPath } from "../../util/ddTest";
import { Grammar, seq, text, choice } from "./grammar";
import { formatParseError, getErrors, parse, TraceTree } from "./parser";
import { jsonGrammar } from "./examples/json";
import { digit, intLit, stringLit } from "./stdlib";
import { extractRuleTree } from "./ruleTree";
import { prettyPrintRuleTree } from "./pretty";
import { metaGrammar, extractGrammar, parseGrammar } from "./meta";
import { datalogOut, plainTextOut, TestOutput } from "../../util/ddTest/types";
import { flatten } from "./flatten";
import { ppRule, ppt } from "../../core/pretty";
import { grammarToDL, inputToDL } from "./datalog/genDatalog";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rule } from "../../core/types";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { genExtractorStr, Options } from "./gen/genExtractor";

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
          "languageWorkbench/parserlib/testdata/basic.dd.txt",
          (t) => parserTest(basicGrammar, t),
          writeResults
        );
      },
    },
    {
      name: "json",
      test() {
        runDDTestAtPath(
          "languageWorkbench/parserlib/testdata/json.dd.txt",
          (t) => parserTestFixedStartRule(jsonGrammar, "value", t),
          writeResults
        );
      },
    },
    {
      name: "meta",
      test() {
        runDDTestAtPath(
          "languageWorkbench/parserlib/testdata/meta.dd.txt",
          metaTest,
          writeResults
        );
      },
    },
    {
      name: "flatten",
      test() {
        runDDTestAtPath(
          "languageWorkbench/parserlib/testdata/flatten.dd.txt",
          flattenTest,
          writeResults
        );
      },
    },
    {
      name: "datalog",
      test() {
        runDDTestAtPath(
          "languageWorkbench/parserlib/testdata/datalog.dd.txt",
          datalogTest,
          writeResults
        );
      },
    },
    {
      name: "datalogInput",
      test() {
        runDDTestAtPath(
          "languageWorkbench/parserlib/testdata/datalogInput.dd.txt",
          datalogInputTest,
          writeResults
        );
      },
    },
    {
      name: "codegen",
      test() {
        runDDTestAtPath(
          "languageWorkbench/parserlib/testdata/codegen.dd.txt",
          codegenTest,
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
    const errors = getErrors(input, traceTree);
    if (errors.length > 0) {
      throw new Error(`errors in metaTest: ${errors.map(formatParseError)}`);
    }
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
  let grammarRules: Rule[] = [];
  return test.map((input) => {
    const lines = input.split("\n");
    const firstLine = lines[0];
    const restOfInput = lines.slice(1).join("\n");
    if (firstLine === "gram") {
      const grammarParsed = parseGrammar(restOfInput);
      grammarRules = grammarToDL(grammarParsed);
      return datalogOut(grammarRules.map(ppRule).join(".\n") + ".");
    } else if (firstLine === "input") {
      // TODO: bring back `initializeInterp` into this package; use here?
      let interp = new IncrementalInterpreter(
        ".",
        fsLoader
      ) as AbstractInterpreter;
      // load parsing rules
      interp = interp.doLoad("languageWorkbench/parserlib/datalog/parse.dl");
      // insert grammar as data
      interp = interp.evalStmts(
        grammarRules.map((rule) => ({ type: "Rule", rule }))
      )[1];
      // insert input as data
      interp = interp.evalStr(".table input.char")[1];
      interp = interp.evalStr(".table input.next")[1];
      interp = interp.insertAll(inputToDL(restOfInput));
      // TODO: insert grammar interpreter
      try {
        const results = interp.queryStr(`main{span: span{from: 0, to: -2}}`);
        return datalogOut(results.map((res) => ppt(res.term) + ".").join("\n"));
      } catch (e) {
        return plainTextOut(`${e}`);
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

function handleResults(traceTree: TraceTree, source: string): TestOutput {
  const ruleTree = extractRuleTree(traceTree);
  const errors = getErrors(source, traceTree);
  return plainTextOut(
    [
      ...prettyPrintRuleTree(ruleTree, source).split("\n"),
      ...errors.map((err) => `error: ${formatParseError(err)}`),
    ].join("\n")
  );
}

function codegenTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const grammar = parseGrammar(input);
    const options: Options = {
      parserlibPath: ".",
      typePrefix: "Json",
      ignoreRules: new Set(["ws"]),
    };
    const output = genExtractorStr(options, grammar);
    return plainTextOut(output);
  });
}
