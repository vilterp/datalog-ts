import * as deepDiff from "deep-diff";
import { Diff } from "deep-diff";

export function assertDeepEqual<T>(expected: T, actual: T) {
  const diff = deepDiff.diff(expected, actual);
  if (diff) {
    throw new DiffError(expected, actual, diff);
  }
}

class DiffError<T> {
  diff: Array<Diff<T, T>>;
  expected: T;
  actual: T;

  constructor(expected: T, actual: T, diff: Array<Diff<T, T>>) {
    this.diff = diff;
    this.expected = expected;
    this.actual = actual;
  }
  toString(): string {
    return `not the same: ${this.diff}`;
  }
}

export type Test = { name: string; test: () => void };

export function runTests(ts: Test[]) {
  const failures = new Set();
  ts.forEach((t) => {
    console.log("=========");
    console.log(t.name);
    try {
      t.test();
    } catch (e) {
      console.error("FAIL:", e);
      failures.add(t.name);
    }
  });
  console.log("failures:", failures);
  console.log(
    "successes:",
    ts.map((t) => t.name).filter((n) => !failures.has(n))
  );
}
