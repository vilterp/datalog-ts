import { unify } from "./unify";

type DB = {
  [relation: string]: Rec[] | Rule; // TODO: indexes
};

type Res = { term: Term; bindings: Bindings };

type Bindings = { [key: string]: Term };

type Rule = {
  head: Rec;
  defn: OrExpr;
};

type OrExpr = { type: "Or"; opts: AndExpr[] };

type AndExpr = { type: "And"; clauses: Rec[] };

type Term =
  | { type: "StringLit"; val: string }
  | { type: "Var"; name: string }
  | Rec;

type Rec = { type: "Record"; relation: string; attrs: { [key: string]: Term } };

// helpers

function str(s: string): Term {
  return { type: "StringLit", val: s };
}

function rec(relation: string, attrs: { [key: string]: Term }): Rec {
  return { type: "Record", relation, attrs };
}

function varr(name: string): Term {
  return { type: "Var", name: name };
}

// Nodes

interface PlanNode {
  Next(): Res | null;
}

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

// query

function planQuery(db: DB, rec: Rec): PlanNode {
  const relation = db[rec.relation];
  if (Array.isArray(relation)) {
    return new ScanNode(rec.relation, relation);
  }
  const initialBindings = unify({}, rec, relation.head);
  const filters = mapXXX;
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

planQuery();
