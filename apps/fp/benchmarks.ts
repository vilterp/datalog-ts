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
      return fpBench(
        () => new SimpleInterpreter("apps/fp/dl", fsLoader),
        200,
        INPUT
      );
    },
  },
  {
    name: "typeQuery1-incr",
    run(): BenchmarkResult {
      return fpBench(
        () => new IncrementalInterpreter("apps/fp/dl", fsLoader),
        200,
        INPUT
      );
    },
  },
];

function fpBench(
  mkInterp: () => AbstractInterpreter,
  repetitions: number,
  input: string
): BenchmarkResult {
  // TODO: get these from a DD file
  const parsed = language.expr.tryParse(input);
  const flattened = flatten(parsed);

  return doBenchmark(repetitions, () => {
    let interp = mkInterp().evalStmt({
      type: "LoadStmt",
      path: "main.dl",
    })[1];
    for (let record of flattened) {
      interp = interp.insert(record);
    }
    interp.queryStr("tc.Type{}");
    interp.queryStr("hl.Segment{}");
    interp.queryStr("ide.Suggestion{}");
    interp.queryStr("ide.RenameCandidate{}");
  });
}
