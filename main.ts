type DB = {
  [relation: string]: Rec[] | Rule; // TODO: indexes
};

type Res = { term: Term; bindings: Bindings };

type Bindings = { [key: string]: Term };

type Rule = {
  head: Rec;
  clauses: Query[];
};

type Term =
  | { type: "StringLit"; val: string }
  | { type: "Var"; name: string }
  | Rec;

type Rec = { type: "Record"; attrs: { [key: string]: Term } };

// helpers

function str(s: string): Term {
  return { type: "StringLit", val: s };
}

function rec(attrs: { [key: string]: Term }): Rec {
  return { type: "Record", attrs: attrs };
}

function varr(name: string): Term {
  return { type: "Var", name: name };
}

function query(relation: string, rec: Rec): Query {
  return { relation, attrs: rec };
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

function unify(prior: Bindings, left: Term, right: Term): Bindings | null {
  switch (left.type) {
    case "StringLit":
      switch (right.type) {
        case "StringLit":
          return left.val === right.val ? {} : null;
        default:
          // TODO: add var case?
          return null;
      }
    case "Var":
      // TODO: what about prior bindings?
      return { [left.name]: right };
    case "Record": {
      switch (right.type) {
        case "Record":
          let accum = {};
          for (const key in Object.keys(left.attrs)) {
            // TODO: do bindings fold across keys... how would that be ordered...
            const leftVal = left.attrs[key];
            const rightVal = right.attrs[key];
            if (!rightVal) {
              return null;
            }
            const res = unify(prior, leftVal, rightVal);
            accum = { ...accum, ...res };
          }
          return accum;
        default:
          // TODO: add var case?
          return null;
      }
    }
  }
}

// could use some kind of existing JS deepEq
function termEq(left: Term, right: Term): boolean {
  switch (left.type) {
    case "StringLit":
      switch (right.type) {
        case "StringLit":
          return left.val === right.val;
        default:
          return false;
      }
    case "Var":
      switch (right.type) {
        case "Var":
          return left.name === right.name;
        default:
          return false;
      }
    case "Record":
      switch (right.type) {
        case "Record":
          for (const key in Object.keys(left.attrs)) {
            const rightVal = right.attrs[key];
            const leftVal = left.attrs[key];
            if (!termEq(leftVal, rightVal)) {
              return false;
            }
          }
          return Object.keys(left).length === Object.keys(right).length;
        default:
          return null;
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

// query

// normal prolog considers this part of a term...
// I'm taking a bit of a different tack...
type Query = {
  relation: string;
  attrs: Rec;
};

function runQuery(db: DB, relation: XXX, rec: Rec): PlanNode {}

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
    rec({ child: str("Pete"), father: str("Paul") }),
    rec({ child: str("Paul"), father: str("Peter") }),
  ],
  grandfather: {
    head: rec({ grandchild: varr("A"), grandfather: varr("C") }),
    clauses: [
      query("father", rec({ child: varr("A"), father: varr("B") })),
      query("father", rec({ child: varr("B"), father: varr("C") })),
    ],
  },
};

runQuery();
