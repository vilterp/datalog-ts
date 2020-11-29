export type DDTest = IOPair[];

export type ProcessFn = (test: DDTest) => TestOutput[];

interface IOPair {
  lineNo: number; // 1-indexed
  input: string;
  output: TestOutput;
}

export type TestOutput = { content: string; mimeType: string };

export type Result = { pair: IOPair; actual: TestOutput };

export function resultsToStr(results: Result[]): string {
  const resultStrs = results.map((r) =>
    [r.pair.input, "----", r.pair.output.mimeType, r.pair.output].join("\n")
  );
  return resultStrs.join("\n\n") + "\n";
}

export function plainTextOut(content: string): TestOutput {
  return {
    content,
    mimeType: "text/plain",
  };
}

export function jsonOut(content: string): TestOutput {
  return {
    content,
    mimeType: "application/json",
  };
}

export function datalogOut(content: string): TestOutput {
  return {
    content,
    mimeType: "application/datalog",
  };
}

export function graphvizOut(content: string): TestOutput {
  return {
    content,
    mimeType: "application/graphviz",
  };
}
