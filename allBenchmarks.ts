import { BenchmarkSpec } from "./util/benchmark";
import { fpBenchmarks } from "./apps/fp/benchmarks";
import { uploadResultToAirtable as postResultToAirtable } from "./util/airtable";
import { parserBenchmarks } from "./parserlib/benchmarks";

const allBenchmarks: { [name: string]: BenchmarkSpec[] } = {
  parserBenchmarks,
  fpBenchmarks,
};

async function runAll() {
  for (let suiteName of Object.keys(allBenchmarks)) {
    console.group(suiteName);
    const suite = allBenchmarks[suiteName];
    for (let entry of suite) {
      console.group(entry.name);
      const res = await entry.run();
      console.log(res);
      const recordName = `${suiteName}/${entry.name}`;
      const airtableRecords = await postResultToAirtable(recordName, res);
      console.log(
        "posted to airtable:",
        airtableRecords.map((r) => r.id)
      );
      console.groupEnd();
    }
    console.groupEnd();
  }
}

// just cuz we don't have top-level await...
runAll()
  .then(() => console.log("done"))
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });
