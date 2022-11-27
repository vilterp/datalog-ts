import { Suite } from "../../util/testBench/testing";
import { runDDTestAtPath } from "../../util/ddTest";
import { formatParseError, getErrors, parse, TraceTree } from "./parser";
import { extractRuleTree } from "./ruleTree";
import { prettyPrintRuleTree } from "./pretty";
import {
  datalogOut,
  datalogOutRules,
  jsonOut,
  plainTextOut,
  TestOutput,
} from "../../util/ddTest/types";
import { ppRule, ppt } from "../../core/pretty";
import { grammarToDL, inputToDL } from "./datalog/genDatalog";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rule } from "../../core/types";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { genExtractorStr, Options } from "./gen/generate";
import { parseMain } from "../languages/grammar/parser";
import { parserGrammarToInternal } from "./translateAST";
import { Grammar, text } from "./types";
import { digit, intLit, stringLit } from "./stdlib";

const basicGrammar: Grammar = {
  abcSeq: { type: "Sequence", items: [text("a"), text("b"), text("c")] },
  abcChoice: { type: "Choice", choices: [text("a"), text("b"), text("c")] },
  digit: digit,
  intLit: intLit,
  stringLit: stringLit,
  intOrString: { type: "Choice", choices: [intLit, stringLit] },
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
    const grammarTree = parseMain(input);
    const grammar = parserGrammarToInternal(grammarTree);
    // TODO: get errors
    // const errors = getErrors(input, traceTree);
    // if (errors.length > 0) {
    //   throw new Error(`errors in metaTest: ${errors.map(formatParseError)}`);
    // }
    return jsonOut(grammar);
  });
}

function datalogTest(test: string[]): TestOutput[] {
  let grammarRules: Rule[] = [];
  return test.map((input) => {
    const lines = input.split("\n");
    const firstLine = lines[0];
    const restOfInput = lines.slice(1).join("\n");
    if (firstLine === "gram") {
      const grammarParsed = parseMain(restOfInput);
      const grammar = parserGrammarToInternal(grammarParsed);
      grammarRules = grammarToDL(grammar);
      return datalogOutRules(grammarRules);
    } else if (firstLine === "input") {
      // TODO: bring back `initializeInterp` into this package; use here?
      let interp = new IncrementalInterpreter(
        ".",
        fsLoader
      ) as AbstractInterpreter;
      // load parsing rules
      interp = interp.doLoad("languageWorkbench/parserlib/datalog/parse.dl");
      // insert grammar as data
      interp = interp.evalRawStmts(
        grammarRules.map((rule) => ({ type: "Rule", rule }))
      )[1];
      // insert input as data
      interp = interp.evalStr(".table input.char")[1];
      interp = interp.evalStr(".table input.next")[1];
      interp = interp.insertAll(inputToDL(restOfInput));
      // TODO: insert grammar interpreter
      try {
        const results = interp.queryStr(`main{span: span{from: 0, to: -2}}`);
        return datalogOut(results.map((res) => res.term));
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
    return datalogOut(inputToDL(input));
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
    const grammarTree = parseMain(input);
    const grammar = parserGrammarToInternal(grammarTree);
    const options: Options = {
      parserlibPath: ".",
      typePrefix: "Json",
      ignoreRules: new Set(["ws"]),
    };
    const output = genExtractorStr(options, grammar);
    return plainTextOut(output);
  });
}
