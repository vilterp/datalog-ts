import {
  BenchmarkResult,
  BenchmarkSpec,
  doBenchmark,
} from "../util/testBench/benchmark";
import { AbstractInterpreter } from "../core/abstractInterpreter";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { fsLoader } from "../core/fsLoader";
import { IncrementalInterpreter } from "../core/incremental/interpreter";
import { parseGrammar } from "./meta";
import { grammarToDL, inputToDL } from "./datalog/genDatalog";
import { parse } from "./parser";

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
        50,
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
        50,
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
  repetitions: number,
  grammarSource: string,
  input: string
): Promise<BenchmarkResult> {
  return doBenchmark(repetitions, () => {
    const loadedInterp = mkInterp().doLoad("parserlib/datalog/parse.dl");
    const grammarParsed = parseGrammar(grammarSource);
    const grammarDL = grammarToDL(grammarParsed);
    const inputDL = inputToDL(input);

    let interp = loadedInterp;
    interp = interp.insertAll(grammarDL);
    interp = interp.insertAll(inputDL);

    interp.queryStr("parse.fullMatch{}");
  });
}

async function parserTestNativeJS(
  repetitions: number,
  grammarSource: string,
  input: string
): Promise<BenchmarkResult> {
  const grammarParsed = parseGrammar(grammarSource);

  return doBenchmark(repetitions, () => {
    parse(grammarParsed, "main", input);
  });
}
