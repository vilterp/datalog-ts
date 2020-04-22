import { Bindings, DB, PlanNode, Rec, Res, str, VarMappings } from "./types";
import { substitute, unify, unifyVars } from "./unify";

export function instantiate(db: DB, spec: PlanNode): ExecNode {
  switch (spec.type) {
    case "And":
      return new AndNode(
        instantiate(db, spec.left),
        instantiate(db, spec.right),
        spec.template
      );
    case "Project":
      return new ProjectNode(
        instantiate(db, spec.inner),
        spec.mappings,
        spec.ruleName
      );
    case "Filter":
      return new FilterNode(instantiate(db, spec.inner), spec.record);
    case "Or":
      return new OrNode(spec.opts.map((opt) => instantiate(db, opt)));
    case "Scan":
      return new ScanNode(spec.relation, db.tables[spec.relation]);
    case "EmptyOnce":
      return new EmptyOnceNode();
  }
}

// Nodes

export interface ExecNode {
  Next(): Res | null; // TODO: add bindings as an argument
  Reset();
}

// basically a join
class AndNode implements ExecNode {
  left: ExecNode;
  right: ExecNode;
  template: Rec;

  curLeft: Res;
  leftDone: boolean;
  rightDone: boolean;

  constructor(left: ExecNode, right: ExecNode, template: Rec) {
    this.left = left;
    this.right = right;
    this.curLeft = null;
    this.leftDone = false;
    this.rightDone = false;
    this.template = template;

    this.advanceLeft();
  }

  advanceLeft() {
    const res = this.left.Next();
    if (res === null) {
      this.leftDone = true;
      return;
    }
    this.curLeft = res;
    this.right.Reset();
    this.rightDone = false;
  }

  Next(): Res | null {
    while (true) {
      if (this.leftDone) {
        return null;
      }
      if (this.rightDone) {
        this.advanceLeft();
        continue;
      }
      const rightRes = this.right.Next();
      if (rightRes === null) {
        this.rightDone = true;
        continue;
      }
      const unifyRes = unifyVars(this.curLeft.bindings, rightRes.bindings);
      // console.log("And.unify:", {
      //   left: this.curLeft.bindings,
      //   right: rightRes.bindings,
      //   res: unifyRes,
      // });

      if (unifyRes === null) {
        continue;
      }

      const resTerm = substitute(this.template, unifyRes);
      return {
        term: resTerm,
        bindings: unifyRes, // why not
        // TODO: trace as well??
      };
    }
  }

  Reset() {
    this.left.Reset();
    this.right.Reset();
    this.curLeft = null;
  }
}

class OrNode implements ExecNode {
  opts: ExecNode[];
  curOptIdx: number;

  constructor(opts: ExecNode[]) {
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

class FilterNode implements ExecNode {
  inner: ExecNode;
  record: Rec;

  constructor(inner: ExecNode, record: Rec) {
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

class ScanNode implements ExecNode {
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

class EmptyOnceNode implements ExecNode {
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

class ProjectNode implements ExecNode {
  inner: ExecNode;
  mappings: VarMappings;
  ruleName: string; // TODO: use this in some kind of trace

  constructor(inner: ExecNode, mappings: VarMappings, ruleName: string) {
    this.inner = inner;
    this.mappings = mappings;
    this.ruleName = ruleName;
  }

  Next(): Res | null {
    const res = this.inner.Next();
    if (res === null) {
      return null;
    }
    return {
      term: res.term,
      bindings: this.applyMappings(res.bindings),
    };
  }

  private applyMappings(bindings: Bindings): Bindings {
    const out: Bindings = {};
    for (const key of Object.keys(bindings)) {
      out[this.mappings[key]] = bindings[key];
    }
    return out;
  }

  Reset() {
    this.inner.Reset();
  }
}
