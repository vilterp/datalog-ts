import { unify } from "./unify";
import { AndExpr, Bindings, DB, rec, Rec, Res, str, Term, varr } from "./types";

// Nodes

interface PlanNode {
  Next(): Res | null;
}

// basically a join
class AndNode implements PlanNode {
  left: PlanNode;
  right: PlanNode;

  curLeft: Term | null;

  constructor(left: PlanNode, right: PlanNode) {
    this.left = left;
    this.right = right;
  }

  Next(): Res | null {
    if (this.curLeft === null) {
    }
    return undefined;
  }
}

class OrNode implements PlanNode {
  opts: PlanNode[];
  curOptIdx: number;

  constructor(opts: PlanNode[]) {
    this.opts = opts;
    this.curOptIdx = 0;
  }

  Next(): Res | null {
    while (true) {
      if (this.curOptIdx === this.opts.length) {
        return null;
      }
      const curOpt = this.opts[this.curOptIdx];
      const res = curOpt.Next();
      if (res === null) {
        this.curOptIdx++;
        continue;
      }
      return res;
    }
  }
}

class FilterNode implements PlanNode {
  inner: PlanNode;
  record: Rec;

  constructor(inner: PlanNode, record: Rec) {
    this.inner = inner;
    this.record = record;
  }

  Next(): Res | null {
    while (true) {
      const next = this.inner.Next();
      if (next === null) {
        return null;
      }
      const bindings = unify(next.bindings, this.record, next.term);
      if (bindings !== null) {
        // hm... are we supposed to use its bindings here?
        return { term: next.term, bindings: bindings };
      }
    }
  }
}

class ScanNode implements PlanNode {
  relationName: string;
  relation: Rec[];
  cursor: number;

  constructor(relationName: string, relation: Rec[]) {
    this.relationName = relationName;
    this.relation = relation;
    this.cursor = 0;
  }

  Next(): Res | null {
    if (this.cursor === this.relation.length) {
      return null;
    }
    const res: Res = {
      term: this.relation[this.cursor],
      bindings: {},
    };
    this.cursor++;
    return res;
  }
}

const SuccessNode: PlanNode = {
  Next(): Res | null {
    return {
      bindings: {},
      term: str(""),
    };
  },
};

// TODO: subquerynode?

// plan

function planQuery(db: DB, rec: Rec): PlanNode {
  const relation = db[rec.relation];
  if (Array.isArray(relation)) {
    return new ScanNode(rec.relation, relation);
  }
  const initialBindings = unify({}, rec, relation.head);
  const andNodes = relation.defn.opts.map((andExpr) => foldAnds(db, andExpr));
  return new OrNode(andNodes);
}

function foldAnds(db: DB, ae: AndExpr): PlanNode {
  return ae.clauses.reduce(
    (accum, next) => new AndNode(accum, scanAndFilterForRec(db, next)),
    SuccessNode
  );
}

function scanAndFilterForRec(db: DB, rec: Rec): PlanNode {
  const relation = db[rec.relation];
  if (!Array.isArray(relation)) {
    throw new Error(`don't support planning with rules yet: ${rec.relation}`);
  }
  return new FilterNode(new ScanNode(rec.relation, relation), rec);
}

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
  const node = planQuery(
    testDB,
    rec("father", { child: str("Pete"), father: varr("A") })
  );
  const results = allResults(node);
  console.log(results);
}

type Test = { name: string; test: () => void };

const tests: (() => void)[] = [testBasic];

tests.forEach((t) => t());
