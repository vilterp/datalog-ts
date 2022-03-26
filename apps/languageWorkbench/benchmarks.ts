import { BenchmarkSpec, runDDBenchmark } from "../../util/testBench/benchmark";
import { testLangQuery } from "./ddTest";

export const lwbBenchmarks: BenchmarkSpec[] = [
  {
    name: "fp",
    async run() {
      return runDDBenchmark(
        "apps/languageWorkbench/languages/fp/fp.dd.txt",
        testLangQuery,
        100
      );
    },
  },
];
