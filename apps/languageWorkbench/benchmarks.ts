import { BenchmarkSpec, runDDBenchmark } from "../../util/testBench/benchmark";
import { testLangQuery } from "./ddTest";

export const lwbBenchmarks: BenchmarkSpec[] = ["fp", "dl"].map((lang) => ({
  name: lang,
  async run() {
    return runDDBenchmark(
      `apps/languageWorkbench/languages/${lang}/${lang}.dd.txt`,
      testLangQuery,
      100
    );
  },
}));
