import {
  BenchmarkResult,
  BenchmarkSpec,
  doBenchmark,
} from "../../util/benchmark";
import { language } from "./parser";
import { flatten } from "./flatten";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { fsLoader } from "../../core/fsLoader";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";

const INPUT = `let x = 2 in let y = 3 in let z = "hello world " in concat(z, intToString(plus(x, 3)))`;

export const fpBenchmarks: BenchmarkSpec[] = [
  {
    name: "typeQuery1-simple",
    run(): BenchmarkResult {
      const originalInterp: AbstractInterpreter = new SimpleInterpreter(
        "apps/fp/dl",
        fsLoader
      );
      return fpBench(originalInterp, 200, INPUT);
    },
  },
  {
    name: "typeQuery1-incr",
    run(): BenchmarkResult {
      const originalInterp: AbstractInterpreter = new IncrementalInterpreter(
        "apps/fp/dl",
        fsLoader
      );
      return fpBench(originalInterp, 200, INPUT);
    },
  },
];

function fpBench(
  emptyInterp: AbstractInterpreter,
  repetitions: number,
  input: string
): BenchmarkResult {
  let loadedInterp = emptyInterp.evalStmt({
    type: "LoadStmt",
    path: "main.dl",
  })[1];

  // TODO: get these from a DD file
  const parsed = language.expr.tryParse(input);
  const flattened = flatten(parsed);

  return doBenchmark(repetitions, () => {
    let interp = loadedInterp;
    for (let record of flattened) {
      interp = interp.insert(record);
    }
    interp.queryStr("tc.Type{}");
    interp.queryStr("hl.Segment{}");
    interp.queryStr("ide.Suggestion{}");
    interp.queryStr("ide.RenameCandidate{}");
  });
}
