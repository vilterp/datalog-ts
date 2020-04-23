import * as diff from "diff";
import * as util from "util";

export function assertDeepEqual<T extends object>(
  expected: T,
  actual: T,
  msg?: string
) {
  const expJSON = util.inspect(expected, { depth: null });
  const actJSON = util.inspect(actual, { depth: null });
  if (actJSON != expJSON) {
    throw new DiffError(expected, actual, msg);
  }
}

class DiffError<T> {
  expected: T;
  actual: T;
  message: string;

  constructor(expected: T, actual: T, msg?: string) {
    this.expected = expected;
    this.actual = actual;
    this.message = msg;
  }
}

export type Test = { name: string; ignored?: boolean; test: () => void };

export function runTests(ts: Test[]) {
  const failures = new Set<string>();
  const ignored = new Set<string>();
  ts.forEach((t) => {
    if (t.ignored) {
      ignored.add(t.name);
      return;
    }
    console.groupCollapsed(t.name);
    try {
      t.test();
      console.groupEnd();
    } catch (e) {
      console.groupEnd();
      if (e instanceof DiffError) {
        const patch = diff.createPatch(
          `${t.name} ${e.message}`,
          util.inspect(e.expected, { depth: null }) + "\n",
          util.inspect(e.actual, { depth: null }) + "\n",
          "expected",
          "actual"
        );
        console.error(patch);
      } else {
        console.error("FAIL:", e);
      }
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
