import v8profiler from "v8-profiler-node8";
import { Performance } from "w3c-hr-time";
import * as fs from "fs";
import { BenchmarkResult, BenchmarkSpec } from "../util/benchmark";
import { AbstractInterpreter } from "../core/abstractInterpreter";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { fsLoader } from "../core/fsLoader";
import { IncrementalInterpreter } from "../core/incremental/interpreter";
import { parseGrammar } from "./meta";
import { grammarToDL, inputToDL } from "./datalog/genDatalog";

const performance = new Performance();

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
    run(): BenchmarkResult {
      const interp: AbstractInterpreter = new SimpleInterpreter(".", fsLoader);
      return parserTest(interp, 10, GRAMMAR, INPUT);
    },
  },
  {
    name: "parse-json-incr",
    run(): BenchmarkResult {
      const interp: AbstractInterpreter = new IncrementalInterpreter(
        ".",
        fsLoader
      );
      return parserTest(interp, 10, GRAMMAR, INPUT);
    },
  },
];

function parserTest(
  emptyInterp: AbstractInterpreter,
  repetitions: number,
  grammarSource: string,
  input: string
): BenchmarkResult {
  try {
    let interp = emptyInterp;
    const loadedInterp = interp.doLoad("parserlib/datalog/parse.dl");
    const grammarParsed = parseGrammar(grammarSource);
    const grammarDL = grammarToDL(grammarParsed);
    const inputDL = inputToDL(input);

    const before = performance.now();

    v8profiler.startProfiling();
    for (let i = 0; i < repetitions; i++) {
      let interp = loadedInterp;
      if (i % 10 === 0) {
        console.log("  ", i);
      }

      interp = interp.insertAll(grammarDL);
      interp = interp.insertAll(inputDL);

      interp.queryStr("parse.fullMatch{}");
    }

    const after = performance.now();
    const profile = v8profiler.stopProfiling();
    v8profiler.deleteAllProfiles();
    const profilePath = `profile-${Math.random()}.cpuprofile`;
    const file = fs.createWriteStream(profilePath);
    profile
      .export()
      .pipe(file)
      .on("finish", () => {
        console.log("wrote profile to", profilePath);
      });

    return {
      type: "Finished",
      repetitions,
      totalTimeMS: after - before,
      profilePath,
    };
  } catch (error) {
    return { type: "Errored", error };
  }
}
