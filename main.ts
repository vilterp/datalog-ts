import { DB, Rec, rec, Res, str, Term, varr } from "./types";
import { instantiate, ExecNode } from "./execNodes";
import { optimize } from "./optimize";
import { planRule } from "./plan";
import * as assert from "assert";

function allResults(node: ExecNode): Res[] {
  const out: Res[] = [];
  while (true) {
    const res = node.Next();
    if (res === null) {
      break;
    }
    out.push(res);
  }
  return out;
}

// test

const testDB: DB = {
  tables: {
    father: [
      rec("father", { child: str("Pete"), father: str("Paul") }),
      rec("father", { child: str("Paul"), father: str("Peter") }),
    ],
    mother: [
      rec("mother", { child: str("Pete"), mother: str("Mary") }),
      rec("mother", { child: str("Paul"), mother: str("Judith") }),
      // TODO
    ],
  },
  rules: {
    parent: {
      head: rec("parent", { child: varr("C"), parent: varr("P") }),
      defn: {
        type: "Or",
        opts: [
          // TODO: allow collapsing single-clause ANDs
          {
            type: "And",
            clauses: [rec("mother", { child: varr("C"), mother: varr("P") })],
          },
          {
            type: "And",
            clauses: [rec("father", { child: varr("C"), father: varr("P") })],
          },
        ],
      },
    },
    grandfather: {
      head: rec("grandfather", {
        grandchild: varr("A"),
        grandfather: varr("C"),
      }),
      defn: {
        type: "Or",
        opts: [
          {
            type: "And",
            clauses: [
              rec("father", { child: varr("A"), father: varr("B") }),
              rec("father", { child: varr("B"), father: varr("C") }),
            ],
          },
        ],
      },
    },
    grandmother: {
      head: rec("grandmother", {
        grandchild: varr("A"),
        grandmother: varr("C"),
      }),
      defn: {
        type: "Or",
        opts: [
          {
            type: "And",
            clauses: [
              rec("mother", { child: varr("A"), mother: varr("B") }),
              rec("mother", { child: varr("B"), mother: varr("C") }),
            ],
          },
        ],
      },
    },
    grandparent: {
      head: rec("grandparent", {
        grandchild: varr("A"),
        grandparent: varr("C"),
      }),
      defn: {
        type: "Or",
        opts: [
          {
            type: "And",
            clauses: [
              rec("parent", { child: varr("A"), parent: varr("B") }),
              rec("parent", { child: varr("B"), parent: varr("C") }),
            ],
          },
        ],
      },
    },
  },
};

type Test = { name: string; test: () => void };

function testQuery(query: Rec, results: Term[]) {
  const spec = planRule(testDB, query);
  console.log("plan spec:");
  console.log(spec);
  const optimized = optimize(spec);
  console.log("optimized:");
  console.log(optimized);
  const node = instantiate(testDB, optimized);
  const actualResults = allResults(node);
  console.log("results:", actualResults);
  assert.deepEqual(actualResults, results);
}

const tests: Test[] = [
  {
    name: "father",
    test: () => {
      testQuery(rec("father", { child: str("Pete"), father: varr("A") }), [
        rec("father", { child: str("Pete"), father: str("Paul") }),
        rec("father", { child: str("Paul"), father: str("Peter") }),
      ]);
    },
  },
  {
    name: "parent",
    test: () => {
      testQuery(rec("parent", { child: str("Pete"), father: varr("A") }), [
        rec("parent", { child: str("Pete"), parent: str("Paul") }),
        rec("parent", { child: str("Paul"), parent: str("Peter") }),
      ]);
    },
  },
  {
    name: "grandfather",
    test: () => {
      testQuery(rec("grandfather", { child: str("Pete"), father: varr("A") }), [
        rec("grandparent", { child: str("Pete"), grandfather: str("Peter") }),
      ]);
    },
  },
  {
    name: "grandparent",
    test: () => {
      testQuery(rec("grandparent", { child: str("Pete"), father: varr("A") }), [
        rec("grandparent", { child: str("Pete"), grandparent: str("Peter") }),
        rec("grandparent", { child: str("Pete"), grandparent: str("Peter") }),
      ]);
    },
  },
];

function runTests(ts: Test[]) {
  const failures = new Set();
  tests.forEach((t) => {
    console.log("=========");
    console.log(t.name);
    try {
      t.test();
    } catch (e) {
      console.error("FAIL:", e.toString());
      failures.add(t.name);
    }
  });
  console.log("failures:", failures);
  console.log(
    "successes:",
    ts.map((t) => t.name).filter((n) => !failures.has(n))
  );
}

runTests(tests);

// @ts-ignore
process.tests = tests;

setInterval(() => {}, 100);
