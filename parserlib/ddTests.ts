import { Suite } from "../util/testing";
import { runDDTestAtPath, DDTest } from "../util/ddTest";
import { Grammar, seq, text, choice } from "./grammar";
import { parse, TraceTree } from "./parser";
import { jsonGrammar } from "./examples/json";
import { digit, intLit, stringLit } from "./stdlib";
import { extractRuleTree } from "./ruleTree";
import { ruleTreeToTree, prettyPrintRuleTree } from "./pretty";
import { metaGrammar, extractGrammar, parseGrammar } from "./meta";
import {
  datalogOut,
  graphvizOut,
  plainTextOut,
  TestOutput,
} from "../util/ddTest/types";
import { grammarToDL, inputToDL } from "./genDatalog";
import { ppRule, ppt } from "../pretty";
import { suiteFromDDTestsInDir } from "../util/ddTest/runner";
import { formatOutput, Interpreter, Output } from "../incremental/interpreter";
import { nullLoader } from "../loaders";
import { toGraphviz } from "../incremental/graphviz";
import { prettyPrintGraph } from "../util/graphviz";
import {
  IncrementalInputManager,
  initializeInterp,
  InputEvt,
} from "./incrementalInput";

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
    ["dlgenGraph", dlGenGraphTest],
    ["inputgen", inputGenTest],
    ["dlparse", dlParseTest],
    ["incrInput", incrInputTest],
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
    const grammar = parseGrammar(input);
    const rules = grammarToDL(grammar);
    return datalogOut(rules.map(ppRule).join("\n"));
  });
}

function dlGenGraphTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const grammar = parseGrammar(input);
    const rules = grammarToDL(grammar);

    const interp = new Interpreter(nullLoader);
    interp.evalStr(".table source");
    interp.evalStr(".table next");

    for (let rule of rules) {
      interp.processStmt({ type: "Rule", rule });
    }

    return graphvizOut(prettyPrintGraph(toGraphviz(interp.graph)));
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

function dlParseTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const [grammarText, inputText] = input.split("--");

    const grammar = parseGrammar(grammarText);
    const rules = grammarToDL(grammar);

    const inputRecs = inputToDL(inputText);

    const interp = new Interpreter(nullLoader);
    interp.evalStr(".table source");
    interp.evalStr(".table next");

    for (let rule of rules) {
      interp.processStmt({ type: "Rule", rule });
    }

    let outputs: Output[] = [];
    for (let record of inputRecs) {
      outputs = outputs.concat(interp.processStmt({ type: "Insert", record }));
    }

    return plainTextOut(
      outputs
        .map(
          (out) =>
            formatOutput(interp.graph, out, {
              propagationLogMode: "test",
              showBindings: true,
            }).content
        )
        .join("\n--\n")
    );
  });
}

function incrInputTest(test: string[]): TestOutput[] {
  const inputManager = new IncrementalInputManager();

  const interp = initializeInterp(`main :- "foo".`);

  const out: TestOutput[] = [];
  for (let input of test) {
    const inputEvent: InputEvt = JSON.parse(input) as InputEvt;

    const statements = inputManager.processEvent(inputEvent);
    const outLines: string[] = [];
    for (let stmt of statements) {
      if (stmt.type === "Insert") {
        outLines.push("> " + ppt(stmt.record));
      }
      const output = interp.processStmt(stmt);
      outLines.push(
        formatOutput(interp.graph, output, {
          showBindings: false,
          propagationLogMode: "repl",
        }).content
      );
    }
    out.push(plainTextOut(outLines.filter((l) => l.length > 0).join("\n")));
  }

  return out;
}
