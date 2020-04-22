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
    console.groupCollapsed(t.name);
    try {
      t.test();
      console.groupEnd();
    } catch (e) {
      console.groupEnd();
      console.error("FAIL:", e);
      failures.add(t.name);
    }
  });
  if (failures.size > 0) {
    console.error(
      "failed tests:",
      failures,
      "successful tests:",
      ts.map((t) => t.name).filter((n) => !failures.has(n))
    );
    throw new Error("test suite failed");
  }
  console.log("PASS");
}

type Suite = Test[];

export function runSuites(suites: { [name: string]: Suite }) {
  const failures = new Set();
  for (const suiteName of Object.keys(suites)) {
    console.log("SUITE", suiteName);
    try {
      runTests(suites[suiteName]);
    } catch {
      failures.add(suiteName);
    }
  }
  if (failures.size > 0) {
    console.error("failed suites:", failures);
    throw new Error("test suites failed");
  }
}
