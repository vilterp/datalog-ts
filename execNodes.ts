import {
  Bindings,
  DB,
  falseTerm,
  Operator,
  PlanNode,
  Rec,
  Res,
  str,
  Term,
  trueTerm,
  VarMappings,
} from "./types";
import { substitute, termEq, unify, unifyVars } from "./unify";

export function allResults(node: ExecNode): Res[] {
  const out: Res[] = [];
  while (true) {
    const res = node.Next({});
    if (res === null) {
      break;
    }
    out.push(res);
  }
  return out;
}

export function instantiate(db: DB, spec: PlanNode): ExecNode {
  switch (spec.type) {
    case "Join":
      return new JoinNode(
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
    case "Match":
      return new MatchNode(instantiate(db, spec.inner), spec.record);
    case "Or":
      return new OrNode(spec.opts.map((opt) => instantiate(db, opt)));
    case "Scan":
      return new ScanNode(spec.relation, db.tables[spec.relation]);
    case "BinExpr":
      return new BinExprNode(spec.op, spec.left, spec.right);
    case "EmptyOnce":
      return new EmptyOnceNode();
  }
}

// Nodes

export interface ExecNode {
  Next(bindings: Bindings): Res | null; // TODO: add bindings as an argument
  Reset();
}

class JoinNode implements ExecNode {
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
  }

  advanceLeft() {
    const res = this.left.Next({});
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
      if (this.curLeft === null) {
        this.advanceLeft();
        continue;
      }
      if (this.leftDone) {
        return null;
      }
      if (this.rightDone) {
        this.advanceLeft();
        continue;
      }
      const rightRes = this.right.Next(this.curLeft.bindings);
      if (rightRes === null) {
        this.rightDone = true;
        continue;
      }
      const unifyRes = unifyVars(this.curLeft.bindings, rightRes.bindings);
      // console.log("And.unify", this.template.relation, ":", {
      //   left: pp.render(100, prettyPrintBindings(this.curLeft?.bindings)),
      //   right: pp.render(100, prettyPrintBindings(rightRes?.bindings)),
      //   res: pp.render(100, unifyRes ? prettyPrintBindings(unifyRes) : "null"),
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
    this.leftDone = false;
    this.rightDone = false;
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
      const res = curOpt.Next({});
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
    const res = this.inner.Next({});
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

class MatchNode implements ExecNode {
  inner: ExecNode;
  record: Rec;

  constructor(inner: ExecNode, record: Rec) {
    this.inner = inner;
    this.record = record;
  }

  Next(): Res | null {
    while (true) {
      const next = this.inner.Next({});
      if (next === null) {
        return null;
      }
      const bindings = unify(next.bindings, this.record, next.term);
      // console.log("filter.next:", {
      //   b: next.bindings,
      //   r: this.record,
      //   t: next.term,
      //   res: bindings,
      // });
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

class BinExprNode implements ExecNode {
  left: Term;
  right: Term;
  op: Operator;

  constructor(op: Operator, left: Term, right: Term) {
    this.op = op;
    this.left = left;
    this.right = right;
  }

  Next(bindings: Bindings): Res | null {
    const subLeft = substitute(this.left, bindings);
    const subRight = substitute(this.right, bindings);
    if (!subLeft || !subRight) {
      console.error({ subLeft, subRight, bindings });
      throw Error(
        `subLeft: ${subLeft}, subRight: ${subRight}, bindings; ${bindings}`
      );
    }
    const trueRes = {
      term: trueTerm,
      bindings,
    };
    const falseRes = { term: falseTerm, bindings };
    const result = (() => {
      switch (this.op) {
        case "!=":
          return !termEq(subLeft, subRight);
        case "=":
          return termEq(subLeft, subRight);
      }
    })();
    return result ? trueRes : falseRes;
  }

  Reset() {}
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
