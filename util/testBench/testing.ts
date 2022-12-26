import * as diff from "diff";
import * as util from "util";
import { Json, jsonEq } from "../json";

// TODO: assert order-independent equal
export function assert(
  cond: boolean,
  expected: string,
  actual: string,
  msg: string
) {
  if (!cond) {
    throw new DiffError(expected, actual, msg);
  }
}

export function assertStringEqual(
  expected: string,
  actual: string,
  msg?: string
) {
  if (expected !== actual) {
    throw new DiffError(expected, actual, msg);
  }
}

export function assertDeepEqual<T extends Json>(
  expected: T,
  actual: T,
  msg?: string
) {
  if (!jsonEq(expected, actual)) {
    throw new DiffError(
      util.inspect(expected, { depth: null }),
      util.inspect(actual, { depth: null }),
      msg
    );
  }
}

class DiffError {
  expected: string;
  actual: string;
  message: string;

  constructor(expected: string, actual: string, msg?: string) {
    this.expected = expected;
    this.actual = actual;
    this.message = msg;
  }
}

export type Test = { name: string; ignored?: boolean; test: () => void };

export function runSuite(ts: Suite) {
  const failures = new Set<string>();
  const ignored = new Set<string>();
  ts.forEach((t) => {
    if (t.ignored) {
      ignored.add(t.name);
      return;
    }
    console.groupCollapsed(`Test ${t.name}`);
    try {
      t.test();
      console.groupEnd();
    } catch (e) {
      console.groupEnd();
      if (e instanceof DiffError) {
        const patch = diff.createPatch(
          `${t.name}`,
          e.expected + "\n",
          e.actual + "\n",
          "expected",
          "actual"
        );
        console.error(patch);
      } else {
        console.error("FAIL", t.name, e);
      }
      failures.add(t.name);
    }
  });
  if (failures.size > 0) {
    console.error(
      "failed tests:",
      failures,
      "successful tests:",
      ts.map((t) => t.name).filter((n) => !failures.has(n) && !ignored.has(n))
    );
    throw new Error("test suite failed");
  }
}

export type Suite = Test[];

export function runSuites(suites: { [name: string]: Suite }) {
  console.log("node", process.version);

  const failures = new Set();
  for (const suiteName of Object.keys(suites)) {
    console.group("Suite", suiteName);
    try {
      runSuite(suites[suiteName]);
      console.log(`PASS ${suiteName}`);
    } catch {
      failures.add(suiteName);
      console.log(`FAIL ${suiteName}`);
    }
    console.groupEnd();
  }
  if (failures.size > 0) {
    console.error("failed suites:", failures);
    throw new Error("test suites failed");
  }
}
