import { Bindings, DB, PlanSpec, Rec, Res, str, Term } from "./types";
import { unify } from "./unify";

export function instantiate(db: DB, spec: PlanSpec): PlanNode {
  switch (spec.type) {
    case "And":
      return new AndNode(
        instantiate(db, spec.left),
        instantiate(db, spec.right)
      );
    case "Filter":
      return new FilterNode(instantiate(db, spec.inner), spec.record);
    case "Or":
      return new OrNode(spec.opts.map((opt) => instantiate(db, opt)));
    case "Scan":
      return new ScanNode(spec.relation, db[spec.relation] as Rec[]);
    case "Success":
      return SuccessNode;
  }
}

// Nodes

export interface PlanNode {
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
