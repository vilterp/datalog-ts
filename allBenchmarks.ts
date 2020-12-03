import { BenchmarkSpec } from "./util/benchmark";
import { incrBenchmarks } from "./incremental/benchmarks";
import { uploadResultToAirtable } from "./util/airtable";

const allBenchmarks: { [name: string]: BenchmarkSpec[] } = {
  incrBenchmarks,
};

async function runAll() {
  for (let suiteName of Object.keys(allBenchmarks)) {
    console.log(suiteName);
    const suite = allBenchmarks[suiteName];
    for (let entry of suite) {
      console.log(`  ${entry.name}`);
      const res = entry.run();
      console.log("  ", res);
      await uploadResultToAirtable(`${suiteName}/${entry.name}`, res);
    }
  }
}

// just cuz we don't have top-level await...
runAll()
  .then(() => console.log("done"))
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });
