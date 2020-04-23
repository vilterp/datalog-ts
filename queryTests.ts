import { Bindings, DB, Rec, rec, Res, str, Term, varr } from "./types";
import { instantiate, ExecNode } from "./execNodes";
import { optimize } from "./optimize";
import { planQuery } from "./plan";
import { assertStringEqual, Test } from "./testing";
import * as pp from "prettier-printer";
import {
  prettyPrintDB,
  prettyPrintPlan,
  prettyPrintResults,
  prettyPrintTerm,
} from "./pretty";
import * as util from "util";

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
      rec("father", { child: str("Ann"), father: str("Peter") }),
      rec("father", { child: str("Mary"), father: str("Mark") }),
    ],
    mother: [
      rec("mother", { child: str("Pete"), mother: str("Mary") }),
      rec("mother", { child: str("Paul"), mother: str("Judith") }),
      rec("mother", { child: str("Ann"), mother: str("Judith") }),
      rec("mother", { child: str("Bob"), mother: str("Ann") }),
      rec("mother", { child: str("Mary"), mother: str("Carolyn K") }),
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
              rec("parent", { child: varr("A"), parent: varr("B") }),
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
              rec("child", { child: varr("A"), parent: varr("B") }),
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
    sibling: {
      head: rec("sibling", { left: varr("L"), right: varr("R") }),
      defn: {
        type: "Or",
        opts: [
          {
            type: "And",
            clauses: [
              rec("mother", { child: varr("L"), mother: varr("M") }),
              rec("father", { child: varr("L"), father: varr("F") }),
              rec("mother", { child: varr("R"), mother: varr("M") }),
              rec("father", { child: varr("R"), father: varr("F") }),
            ],
          },
        ],
      },
    },
    cousin: {
      head: rec("cousin", { left: varr("L"), right: varr("R") }),
      defn: {
        type: "Or",
        opts: [
          {
            type: "And",
            clauses: [
              rec("parent", { child: varr("L"), mother: varr("P1") }),
              rec("sibling", { left: varr("P1"), right: varr("P2") }),
              rec("parent", { child: varr("R"), parent: varr("P2") }),
            ],
          },
        ],
      },
    },
  },
};

function testQuery(
  query: Rec,
  expectedResults: { term: Term; bindings: Bindings }[]
) {
  console.log("query:", pp.render(100, prettyPrintTerm(query)));
  const plan = planQuery(testDB, query);
  const optimizedPlan = optimize(plan);
  console.groupCollapsed("optimized plan:");
  console.log(pp.render(100, prettyPrintPlan(optimizedPlan)));
  console.groupEnd();
  const node = instantiate(testDB, optimizedPlan);
  const actualResults = allResults(node);

  // TODO: optionally print trace...
  // TODO: make this disregard order of results
  const expectedPrinted = pp.render(100, prettyPrintResults(expectedResults));
  const actualPrinted = pp.render(100, prettyPrintResults(actualResults));

  console.groupCollapsed("results");
  console.log(actualPrinted);
  console.groupEnd();

  assertStringEqual(expectedPrinted, actualPrinted, "results");
}

export const queryTests: Test[] = [
  {
    name: "DB", // just pretty print the DB
    test: () => {
      console.log(pp.render(100, prettyPrintDB(testDB)));
    },
  },
  {
    name: "father_all",
    test: () => {
      testQuery(
        rec("father", { child: varr("X"), father: varr("Y") }),

        [
          {
            term: rec("father", { child: str("Pete"), father: str("Paul") }),
            bindings: { X: str("Pete"), Y: str("Paul") },
          },
          {
            term: rec("father", { child: str("Paul"), father: str("Peter") }),
            bindings: { X: str("Paul"), Y: str("Peter") },
          },
          {
            term: rec("father", { child: str("Ann"), father: str("Peter") }),
            bindings: { X: str("Ann"), Y: str("Peter") },
          },
          {
            term: rec("father", { child: str("Mary"), father: str("Mark") }),
            bindings: { X: str("Mary"), Y: str("Mark") },
          },
        ]
      );
    },
  },
  {
    name: "father_Pete",
    test: () => {
      testQuery(rec("father", { child: str("Pete"), father: varr("A") }), [
        {
          term: rec("father", { child: str("Pete"), father: str("Paul") }),
          bindings: { A: str("Paul") },
        },
      ]);
    },
  },
  {
    name: "parent_all",
    test: () => {
      testQuery(
        rec("parent", { child: varr("X"), parent: varr("Y") }),

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
            term: rec("parent", { child: str("Ann"), parent: str("Judith") }),
            bindings: { X: str("Ann"), Y: str("Judith") },
          },
          {
            term: rec("parent", { child: str("Bob"), parent: str("Ann") }),
            bindings: { X: str("Bob"), Y: str("Ann") },
          },
          {
            term: rec("parent", {
              child: str("Mary"),
              parent: str("Carolyn K"),
            }),
            bindings: { X: str("Mary"), Y: str("Carolyn K") },
          },
          {
            term: rec("parent", { child: str("Pete"), parent: str("Paul") }),
            bindings: { X: str("Pete"), Y: str("Paul") },
          },
          {
            term: rec("parent", { child: str("Paul"), parent: str("Peter") }),
            bindings: { X: str("Paul"), Y: str("Peter") },
          },
          {
            term: rec("parent", { child: str("Ann"), parent: str("Peter") }),
            bindings: { X: str("Ann"), Y: str("Peter") },
          },
          {
            term: rec("parent", { child: str("Mary"), parent: str("Mark") }),
            bindings: { X: str("Mary"), Y: str("Mark") },
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
    name: "grandfather_Pete",
    test: () => {
      testQuery(
        rec("grandfather", { grandchild: str("Pete"), grandfather: varr("A") }),

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
          {
            term: rec("grandfather", {
              grandchild: str("Pete"),
              grandfather: str("Mark"),
            }),
            bindings: {
              A: str("Mark"),
            },
          },
        ]
      );
    },
  },
  {
    name: "grandparent_Pete",
    test: () => {
      testQuery(
        rec("grandparent", { grandchild: str("Pete"), grandparent: varr("X") }),

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
              grandparent: str("Carolyn K"),
            }),
            bindings: {
              X: str("Carolyn K"),
            },
          },
          {
            term: rec("grandparent", {
              grandchild: str("Pete"),
              grandparent: str("Peter"),
            }),
            bindings: { X: str("Peter") },
          },
          {
            term: rec("grandparent", {
              grandchild: str("Pete"),
              grandparent: str("Mark"),
            }),
            bindings: { X: str("Mark") },
          },
        ]
      );
    },
  },
  {
    name: "grandparent_all",
    test: () => {
      testQuery(
        rec("grandparent", { grandchild: varr("X"), grandparent: varr("Y") }),

        []
      );
    },
  },
  {
    name: "sibling_all",
    ignored: true,
    test: () => {
      testQuery(rec("sibling", { left: varr("L"), right: varr("R") }), [
        {
          term: rec("sibling", { left: str("Paul"), right: str("Ann") }),
          bindings: { L: str("Paul"), R: str("Ann") },
        },
      ]);
    },
  },
  {
    name: "cousin_all",
    ignored: true,
    test: () => {
      testQuery(rec("cousin", { left: varr("L"), right: varr("R") }), [
        {
          term: rec("cousin", { left: str("Pete"), right: str("Bob") }),
          bindings: { L: str("Pete"), R: str("Bob") },
        },
      ]);
    },
  },
];
