import { BenchmarkSpec, runAll } from "./util/testBench/benchmark";
import { fpBenchmarks } from "./apps/fp/benchmarks";
import { parserBenchmarks } from "./parserlib/benchmarks";
import { lwbBenchmarks } from "./uiCommon/ide/dlPowered/benchmarks";

const allBenchmarks: { [name: string]: BenchmarkSpec[] } = {
  parserBenchmarks,
  fpBenchmarks,
  lwbBenchmarks,
};

// just cuz we don't have top-level await...
runAll(allBenchmarks)
  .then(() => console.log("done"))
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });
