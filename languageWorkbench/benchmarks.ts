import { BenchmarkSpec, runDDBenchmark } from "../util/testBench/benchmark";
import { testLangQuery } from "./ddTests";

export const lwbBenchmarks: BenchmarkSpec[] = ["fp", "dl"].map((lang) => ({
  name: lang,
  async run() {
    return runDDBenchmark(
      `languageWorkbench/languages/${lang}/${lang}.dd.txt`,
      testLangQuery
    );
  },
}));
