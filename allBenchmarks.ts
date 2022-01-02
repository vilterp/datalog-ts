import { BenchmarkSpec, runAll } from "./util/testBench/benchmark";
import { fpBenchmarks } from "./apps/fp/benchmarks";
import { parserBenchmarks } from "./parserlib/benchmarks";

const allBenchmarks: { [name: string]: BenchmarkSpec[] } = {
  parserBenchmarks,
  fpBenchmarks,
};

// just cuz we don't have top-level await...
runAll(allBenchmarks)
  .then(() => console.log("done"))
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });
