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
    case "EmptyOnce":
      return new EmptyOnceNode();
  }
}

// Nodes

export interface PlanNode {
  Next(): Res | null; // TODO: add bindings as an argument
  Reset();
}

// basically a join
class AndNode implements PlanNode {
  left: PlanNode;
  right: PlanNode;

  curLeft: Res | null;
  done: boolean;

  constructor(left: PlanNode, right: PlanNode) {
    this.left = left;
    this.right = right;
    this.curLeft = null;
    this.done = false;
  }

  Next(): Res | null {
    if (this.done) {
      return null;
    }
    console.log("And.next");
    let bindings: Bindings = {};
    while (true) {
      if (this.curLeft === null && !this.done) {
        this.right.Reset();
        const leftRes = this.left.Next();
        console.log("And.next: left next:", leftRes);
        if (leftRes === null) {
          this.done = true;
          return { term: str(""), bindings };
        }
        this.curLeft = leftRes;
      }
      const rightRes = this.right.Next();
      if (rightRes === null) {
        // TODO: advance left
        continue;
      }
      // TODO: do something with these bindings...?
      const unifyRes = unify(bindings, this.curLeft.term, rightRes.term);
      if (unifyRes === null) {
        return null;
      }
      bindings = { ...bindings, ...unifyRes };
    }
  }

  Reset() {
    this.left.Reset();
    this.right.Reset();
    this.curLeft = null;
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

  Reset() {
    this.curOptIdx = 0;
    this.opts.forEach((o) => o.Reset());
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

  Reset() {
    this.inner.Reset();
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

  Reset() {
    this.cursor = 0;
  }
}

class EmptyOnceNode implements PlanNode {
  done: boolean;

  constructor() {
    this.done = false;
  }

  Next(): Res | null {
    if (this.done) {
      return null;
    }
    return {
      term: str(""),
      bindings: {},
    };
  }

  Reset() {
    this.done = false;
  }
}
