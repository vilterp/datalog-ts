import {
  BenchmarkResult,
  BenchmarkSpec,
  doBenchmark,
  doBenchmarkTimeBudget,
} from "../../util/testBench/benchmark";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { fsLoader } from "../../core/fsLoader";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { grammarToDL, inputToDL } from "./datalog/genDatalog";
import { parse } from "./parser";
import { parseMain } from "../languages/grammar/parser";
import { parserGrammarToInternal } from "./translateAST";
import { ParseErrors } from "./types";

const GRAMMAR = `main :- value.
value :- (object | array | int | string | null).
int :- [[0-9], repSep([0-9], "")].
object :- ["{", repSep(keyValue, ","), "}"].
keyValue :- [string, ":", value].
string :- ["'", repSep([a-z], ""), "'"].
array :- ["[", repSep(value, ","), "]"].
null :- "null".
`;

const INPUT = "[{'a':null,'b':'bar','c':[1]},3]";

export const parserBenchmarks: BenchmarkSpec[] = [
  {
    name: "parse-json-simple",
    async run(): Promise<BenchmarkResult> {
      return parserTestDatalog(
        () => new SimpleInterpreter(".", fsLoader),
        GRAMMAR,
        INPUT
      );
    },
  },
  {
    name: "parse-json-incr",
    async run(): Promise<BenchmarkResult> {
      return parserTestDatalog(
        () => new IncrementalInterpreter(".", fsLoader),
        GRAMMAR,
        INPUT
      );
    },
  },
  {
    name: "parse-json-native",
    async run(): Promise<BenchmarkResult> {
      return parserTestNativeJS(10000, GRAMMAR, INPUT);
    },
  },
];

async function parserTestDatalog(
  mkInterp: () => AbstractInterpreter,
  grammarSource: string,
  input: string
): Promise<BenchmarkResult> {
  const loadedInterp = mkInterp().doLoad(
    "languageWorkbench/parserlib/datalog/parse.dl"
  );
  const [grammarTree, errors] = parseMain(grammarSource);
  if (errors.length > 0) {
    throw new ParseErrors(errors);
  }
  const grammarParsed = parserGrammarToInternal(grammarTree);
  const grammarDL = grammarToDL(grammarParsed);
  const inputDL = inputToDL(input);

  return doBenchmarkTimeBudget(() => {
    let interp = loadedInterp;
    interp = interp.evalRawStmts(
      grammarDL.map((record) => ({ type: "Fact", record }))
    )[1];
    interp = interp.insertAll(inputDL);

    interp.queryStr("parse.Complete{}");
  });
}

async function parserTestNativeJS(
  repetitions: number,
  grammarSource: string,
  input: string
): Promise<BenchmarkResult> {
  const [grammarTree, errors] = parseMain(grammarSource);
  if (errors.length > 0) {
    throw new ParseErrors(errors);
  }
  const grammarParsed = parserGrammarToInternal(grammarTree);

  return doBenchmark(repetitions, () => {
    parse(grammarParsed, "main", input);
  });
}
