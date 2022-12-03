import { BenchmarkSpec, runAll } from "./util/testBench/benchmark";
import { parserBenchmarks } from "./languageWorkbench/parserlib/benchmarks";
import {
  lwbBenchmarks,
  nativeDLBenchmark,
} from "./languageWorkbench/benchmarks";

const allBenchmarks: { [name: string]: BenchmarkSpec[] } = {
  parserBenchmarks,
  lwbBenchmarks,
  nativeDLBenchmarks: [nativeDLBenchmark],
};

// just cuz we don't have top-level await...
runAll(allBenchmarks)
  .then(() => console.log("done"))
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });
