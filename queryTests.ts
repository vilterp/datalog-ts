import {
  Bindings,
  DB,
  PlanNode,
  Rec,
  rec,
  Res,
  str,
  Term,
  varr,
} from "./types";
import { instantiate, ExecNode } from "./execNodes";
import { optimize } from "./optimize";
import { planQuery } from "./plan";
import { assertDeepEqual, runTests, Test } from "./testing";

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

function testQuery(
  query: Rec,
  expectedOptimizedPlan: PlanNode,
  expectedResults: { term: Term; bindings: Bindings }[]
) {
  console.log("query", query);
  const spec = planQuery(testDB, query);
  const optimized = optimize(spec);
  const node = instantiate(testDB, optimized);
  const actualResults = allResults(node);
  // TODO: make this disregard order of results
  assertDeepEqual(expectedOptimizedPlan, optimized, "plan");
  assertDeepEqual(
    expectedResults,
    actualResults.map((r) => ({
      term: r.term,
      bindings: r.bindings,
    })), // TODO: test trace as well?
    "results"
  );
}

export const queryTests: Test[] = [
  {
    name: "father_all",
    test: () => {
      testQuery(
        rec("father", { child: varr("X"), father: varr("Y") }),
        { type: "EmptyOnce" },
        [
          {
            term: rec("father", { child: str("Pete"), father: str("Paul") }),
            bindings: { X: str("Pete"), Y: str("Paul") },
          },
          {
            term: rec("father", { child: str("Paul"), father: str("Peter") }),
            bindings: { X: str("Paul"), Y: str("Peter") },
          },
        ]
      );
    },
  },
  {
    name: "father_Pete",
    test: () => {
      testQuery(
        rec("father", { child: str("Pete"), father: varr("A") }),
        { type: "EmptyOnce" },
        [
          {
            term: rec("father", { child: str("Pete"), father: str("Paul") }),
            bindings: { A: str("Paul") },
          },
        ]
      );
    },
  },
  {
    name: "parent_all",
    test: () => {
      testQuery(
        rec("parent", { child: varr("X"), parent: varr("Y") }),
        { type: "EmptyOnce" },
        [
          // TODO: these results are't right! supposed to be filtering to just Pete's parents!
          {
            term: rec("parent", { child: str("Pete"), parent: str("Mary") }),
            bindings: { X: str("Pete"), Y: str("Mary") },
          },
          {
            term: rec("parent", { child: str("Paul"), parent: str("Judith") }),
            bindings: { X: str("Paul"), Y: str("Judith") },
          },
          {
            term: rec("parent", { child: str("Pete"), parent: str("Paul") }),
            bindings: { X: str("Pete"), Y: str("Paul") },
          },
          {
            term: rec("parent", { child: str("Paul"), parent: str("Peter") }),
            bindings: { X: str("Paul"), Y: str("Peter") },
          },
        ]
      );
    },
  },
  {
    name: "parent_Pete",
    test: () => {
      testQuery(
        rec("parent", { child: str("Pete"), parent: varr("A") }),
        { type: "EmptyOnce" },
        [
          // TODO: these results are't right! supposed to be filtering to just Pete's parents!
          {
            term: rec("parent", { child: str("Pete"), parent: str("Mary") }),
            bindings: { A: str("Mary") },
          },
          {
            term: rec("parent", { child: str("Pete"), parent: str("Paul") }),
            bindings: { A: str("Paul") },
          },
        ]
      );
    },
  },
  {
    name: "grandfather",
    test: () => {
      testQuery(
        rec("grandfather", { grandchild: str("Pete"), grandfather: varr("A") }),
        { type: "EmptyOnce" },
        [
          {
            term: rec("grandfather", {
              grandchild: str("Pete"),
              grandfather: str("Peter"),
            }),
            bindings: {
              A: str("Peter"),
            },
          },
        ]
      );
    },
  },
  {
    name: "grandparent",
    test: () => {
      testQuery(
        rec("grandparent", { grandchild: str("Pete"), grandparent: varr("X") }),
        { type: "EmptyOnce" },
        [
          {
            term: rec("grandparent", {
              grandchild: str("Pete"),
              grandparent: str("Judith"),
            }),
            bindings: {
              X: str("Judith"),
            },
          },
          {
            term: rec("grandparent", {
              grandchild: str("Pete"),
              grandparent: str("Peter"),
            }),
            bindings: { X: str("Peter") },
          },
        ]
      );
    },
  },
];
