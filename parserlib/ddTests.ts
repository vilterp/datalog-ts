import { Suite } from "../testing";
import { runDDTestAtPath, DDTest, Result } from "../util/dataDrivenTests";
import { Grammar, seq, text, choice } from "./grammar";
import { parse } from "./parser";
import { jsonGrammar } from "./examples/json";
import { digit, intLit, stringLit } from "./stdlib";

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
  ];
}

function parserTest(grammar: Grammar, test: DDTest): Result[] {
  return test.map((pair) => {
    const lines = pair.input.split("\n");
    const tree = parse(grammar, lines[0], lines.slice(1).join("\n"));
    return { pair, actual: JSON.stringify(tree, null, 2) + "\n" };
  });
}

function parserTestFixedStartRule(
  grammar: Grammar,
  startRule: string,
  test: DDTest
): Result[] {
  return test.map((pair) => {
    const tree = parse(grammar, startRule, pair.input);
    return { pair, actual: JSON.stringify(tree, null, 2) + "\n" };
  });
}
