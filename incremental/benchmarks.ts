import {
  BenchmarkResult,
  BenchmarkSpec,
  runDDBenchmark,
} from "../util/benchmark";
import { evalTest } from "./ddTests";
import { clearJoinStats, getJoinStats } from "./eval";

export const incrBenchmarks: BenchmarkSpec[] = [
  {
    name: "fp2",
    run(): BenchmarkResult {
      const res = runDDBenchmark(
        "incremental/testdata/fp2.dd.txt",
        evalTest,
        1000
      );
      console.log(getJoinStats());
      clearJoinStats();
      return res;
    },
  },
];
