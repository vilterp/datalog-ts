export type DDTest = IOPair[];

export type ProcessFn = (test: DDTest) => string[];

interface IOPair {
  lineNo: number; // 1-indexed
  input: string;
  output: string;
}

export type Result = { pair: IOPair; actual: string };

export function resultsToStr(results: Result[]): string {
  const resultStrs = results.map((r) =>
    (r.actual.length === 0
      ? [r.pair.input, "----"]
      : [r.pair.input, "----", r.actual]
    ).join("\n")
  );
  return resultStrs.join("\n\n") + "\n";
}
