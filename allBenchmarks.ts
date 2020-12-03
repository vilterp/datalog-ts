import { BenchmarkSpec } from "./util/benchmark";
import { incrBenchmarks } from "./incremental/benchmarks";

const allBenchmarks: { [name: string]: BenchmarkSpec[] } = {
  incrBenchmarks,
};

for (let suiteName of Object.keys(allBenchmarks)) {
  console.log(suiteName);
  const suite = allBenchmarks[suiteName];
  for (let entry of suite) {
    console.log(`  ${entry.name}`);
    console.log("  ", entry.run());
  }
}
