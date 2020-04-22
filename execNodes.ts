import {
  Bindings,
  DB,
  PlanNode,
  rec,
  Rec,
  Res,
  str,
  VarMappings,
} from "./types";
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
        spec.ruleHead
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
        bindings: unifyRes,
        trace: {
          type: "AndTrace",
          right: this.curLeft,
          left: rightRes,
        },
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

class ProjectNode implements ExecNode {
  inner: ExecNode;
  headToCaller: VarMappings;
  ruleHead: Rec; // TODO: use this in some kind of trace

  constructor(inner: ExecNode, mappings: VarMappings, ruleHead: Rec) {
    this.inner = inner;
    this.headToCaller = mappings;
    this.ruleHead = ruleHead;
  }

  Next(): Res | null {
    const res = this.inner.Next();
    if (res === null) {
      return null;
    }
    const mappedBindings = this.applyMappings(res.bindings);
    const substitutedTerm =
      res.term.type === "Record"
        ? substitute(this.ruleHead, res.bindings)
        : res.term;
    // console.log("sub", {
    //   head: this.ruleHead,
    //   bindings: mappedBindings,
    //   res: substitutedTerm,
    //   obj: this,
    // });
    return {
      term: substitutedTerm,
      bindings: mappedBindings,
      trace: {
        type: "ProjectTrace",
        ruleName: this.ruleHead.relation,
        inner: res,
        mappings: this.headToCaller,
      },
    };
  }

  private applyMappings(bindings: Bindings): Bindings {
    const out: Bindings = {};
    for (const key of Object.keys(bindings)) {
      const callerKey = this.headToCaller[key];
      if (!callerKey) {
        continue;
      }
      out[callerKey] = bindings[key];
    }
    return out;
  }

  Reset() {
    this.inner.Reset();
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
        return {
          term: next.term,
          bindings: bindings,
          trace: {
            type: "FilterTrace",
            record: this.record,
            inner: next,
          },
        };
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
