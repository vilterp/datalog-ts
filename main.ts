import { planQuery } from "./plan";
import { DB, rec, Res, str, varr } from "./types";
import { instantiate, ExecNode } from "./execNodes";
import * as util from "util";
import { optimize } from "./optimize";
import * as https from "https";

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
      head: rec("grandmother", {
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

const tests: Test[] = [
  {
    name: "father",
    test: () => {
      const spec = planQuery(
        testDB,
        rec("father", { child: str("Pete"), father: varr("A") })
      );
      console.log("plan spec:");
      console.log(spec);
      const node = instantiate(testDB, spec);
      const results = allResults(node);
      console.log("results:");
      results.forEach((r) => console.log(r));
    },
  },
  {
    name: "parent",
    test: () => {
      const spec = planQuery(
        testDB,
        rec("parent", { child: str("Pete"), father: varr("A") })
      );
      console.log("plan spec:");
      console.log(spec);
      const optimized = optimize(spec);
      console.log("optimized:");
      console.log(optimized);
      const node = instantiate(testDB, optimized);
      const results = allResults(node);
      console.log("results:");
      results.forEach((r) => console.log(r));
    },
  },
  {
    name: "grandfather",
    test: () => {
      const spec = planQuery(
        testDB,
        rec("grandfather", { child: str("Pete"), father: varr("A") })
      );
      console.log("plan spec:");
      console.log(spec);
      const optimized = optimize(spec);
      console.log("optimized:");
      console.log(optimized);
      const node = instantiate(testDB, optimized);
      const results = allResults(node);
      console.log("results:");
      results.forEach((r) => console.log(r));
    },
  },
  // {
  //   name: "grandparent",
  //   test: () => {
  //     const spec = planQuery(
  //       testDB,
  //       rec("grandparent", { child: str("Pete"), father: varr("A") })
  //     );
  //     console.log("plan spec:");
  //     console.log(spec);
  //     const optimized = optimize(spec);
  //     console.log("optimized:");
  //     console.log(optimized);
  //     const node = instantiate(testDB, optimized);
  //     const results = allResults(node);
  //     console.log("results:");
  //     results.forEach((r) => console.log(util.inspect(r, { depth: null })));
  //   },
  // },
];

tests.forEach((t) => {
  console.log(t.name);
  console.log("=========");
  t.test();
});

// @ts-ignore
process.tests = tests;

setInterval(() => {}, 100);
