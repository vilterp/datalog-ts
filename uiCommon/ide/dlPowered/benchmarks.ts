import {
  BenchmarkSpec,
  runDDBenchmark,
} from "../../../util/testBench/benchmark";
import { testLangQuery } from "./ddTests";

export const lwbBenchmarks: BenchmarkSpec[] = [
  { lang: "fp", reps: 100 },
  { lang: "dl", reps: 20 },
].map(({ lang, reps }) => ({
  name: lang,
  async run() {
    return runDDBenchmark(
      `uiCommon/ide/dlPowered/languages/${lang}/${lang}.dd.txt`,
      testLangQuery,
      reps
    );
  },
}));
