import { unify } from "./unify";
import { planQuery } from "./plan";
import {
  Bindings,
  DB,
  PlanSpec,
  rec,
  Rec,
  Res,
  str,
  Term,
  varr,
} from "./types";
import { instantiate, PlanNode } from "./planNodes";

function allResults(node: PlanNode): Bindings[] {
  const out: Bindings[] = [];
  while (true) {
    const res = node.Next();
    if (res === null) {
      break;
    }
    out.push(res.bindings);
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
  console.log("results:", results);
}

type Test = { name: string; test: () => void };

const tests: Test[] = [{ name: "basic", test: testBasic }];

tests.forEach((t) => {
  console.log(t.name);
  console.log("=========");
  t.test();
});
