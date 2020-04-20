import { planQuery } from "./plan";
import { Bindings, DB, rec, Res, str, varr } from "./types";
import { instantiate, PlanNode } from "./planNodes";

function allResults(node: PlanNode): Res[] {
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
  father: [
    rec("father", { child: str("Pete"), father: str("Paul") }),
    rec("father", { child: str("Paul"), father: str("Peter") }),
  ],
  grandfather: {
    head: rec("grandfather", { grandchild: varr("A"), grandfather: varr("C") }),
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
};

function testBasic() {
  const spec = planQuery(
    testDB,
    rec("father", { child: str("Pete"), father: varr("A") })
  );
  console.log("plan spec:", spec);
  const node = instantiate(testDB, spec);
  const results = allResults(node);
  console.log("results:");
  results.forEach((r) => console.log(r));
}

type Test = { name: string; test: () => void };

const tests: Test[] = [{ name: "basic", test: testBasic }];

tests.forEach((t) => {
  console.log(t.name);
  console.log("=========");
  t.test();
});
