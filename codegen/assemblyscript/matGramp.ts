// import "wasi";

// type i32 = number;

class Res {
  rec: Rec;
  bindings: Map<string, Term>;
}

class Term {}

// TODO: avoid this somehow
class StrTerm extends Term {
  val: string;
  constructor(val: string) {
    super();
    this.val = val;
  }
}

class Rec extends Term {
  relation: string;
  attrs: Map<string, Term>;
}

function termEq(left: Term, right: Term): boolean {
  return (
    left instanceof StrTerm &&
    right instanceof StrTerm &&
    (left as StrTerm).val === (right as StrTerm).val
  );
}

type NodeID = i32;

class Insertion {
  origin: NodeID; // -1: inserted from outside
  destination: NodeID;
  res: Res;
}

const MOTHER = 10;
const FATHER = 11;
const MAT_GRAMP = 12;

class MatGramp {
  // TODO: indexes on these relations
  cache_0: Res[];
  cache_1: Res[];
  cache_matGramp: Res[];

  queue: Insertion[];

  constructor() {
    this.queue = [];
    this.cache_0 = [];
    this.cache_1 = [];
    this.cache_matGramp = [];
  }

  getInsId(relation: string): NodeID {
    if (relation === "mother") {
      return MOTHER;
    } else if (relation === "father") {
      return FATHER;
    }
    return -1;
  }

  // idk man
  insertFact(rec: Rec): Res[] {
    this.queue.push({
      origin: -1,
      destination: this.getInsId(rec.relation),
      res: { rec, bindings: new Map<string, Term>() },
    });
    const out: Res[] = [];
    while (this.queue.length > 0) {
      const ins = this.queue.shift();
      switch (ins.destination) {
        case MOTHER:
          this.insert_mother(ins);
          break;
        case FATHER:
          this.insert_father(ins);
          break;
        case 0:
          this.insert_0(ins);
          break;
        case 1:
          this.insert_1(ins);
          break;
        case 2:
          this.insert_2(ins);
          break;
        case MAT_GRAMP:
          const out_matGramp = this.insert_matGramp(ins);
          for (let i = 0; i < out_matGramp.length; i++) {
            out.push(out_matGramp[i]);
          }
          break;
      }
    }
    return out;
  }

  insert_mother(ins: Insertion): void {
    this.queue.push({ destination: 0, origin: MOTHER, res: ins.res });
  }

  insert_father(ins: Insertion): void {
    this.queue.push({ destination: 1, origin: FATHER, res: ins.res });
  }

  insert_0(ins: Insertion): void {
    const bindings = new Map<string, Term>();
    bindings.set("A", ins.res.rec.attrs.get("child"));
    bindings.set("B", ins.res.rec.attrs.get("mother"));
    const res: Res = {
      rec: ins.res.rec,
      bindings,
    };
    this.cache_0.push(res);
    this.queue.push({
      destination: 2,
      origin: 0,
      res,
    });
  }

  insert_1(ins: Insertion): void {
    const bindings = new Map<string, Term>();
    bindings.set("B", ins.res.rec.attrs.get("child"));
    bindings.set("C", ins.res.rec.attrs.get("father"));
    const res: Res = {
      rec: ins.res.rec,
      bindings,
    };
    this.cache_1.push(res);
    this.queue.push({
      destination: 2,
      origin: 1,
      res: res,
    });
  }

  insert_2(ins: Insertion): void {
    if (ins.origin === 1) {
      // TODO: use index
      for (let i = 0; i < this.cache_0.length; i++) {
        const item_0 = this.cache_0[i];
        if (termEq(item_0.bindings.get("B"), ins.res.bindings.get("B"))) {
          const bindings = new Map<string, Term>();
          bindings.set("A", item_0.bindings.get("A"));
          bindings.set("B", ins.res.bindings.get("B"));
          bindings.set("C", ins.res.bindings.get("C"));
          this.queue.push({
            destination: MAT_GRAMP,
            origin: 2,
            res: { rec: ins.res.rec, bindings },
          });
        }
      }
    } else if (ins.origin === 0) {
      for (let i = 0; i < this.cache_1.length; i++) {
        const item_1 = this.cache_1[i];
        if (item_1.bindings.get("B") === ins.res.bindings.get("B")) {
          const bindings = new Map<string, Term>();
          bindings.set("A", ins.res.bindings.get("A"));
          bindings.set("B", ins.res.bindings.get("B"));
          bindings.set("C", item_1.bindings.get("C"));
          this.queue.push({
            destination: MAT_GRAMP,
            origin: 2,
            res: {
              rec: ins.res.rec,
              bindings,
            },
          });
        }
      }
    } else {
      throw new Error(`unexpected origin ${ins.origin}`);
    }
  }

  insert_matGramp(ins: Insertion): Res[] {
    this.cache_matGramp.push(ins.res);
    const out: Res[] = [];
    const attrs = new Map<string, Term>();
    attrs.set("grandchild", ins.res.bindings.get("A"));
    attrs.set("grandfather", ins.res.bindings.get("C"));
    const rec: Rec = { relation: "matGramp", attrs };
    const res: Res = { rec, bindings: ins.res.bindings };
    out.push(res);
    return out;
  }
}

export function test(): i32 {
  const mg = new MatGramp();
  const mAttrs = new Map<string, Term>();
  mAttrs.set("child", new StrTerm("Pete"));
  mAttrs.set("mother", new StrTerm("Mary"));
  const o1 = mg.insertFact({ relation: "mother", attrs: mAttrs });

  const fAttrs = new Map<string, Term>();
  fAttrs.set("child", new StrTerm("Mary"));
  fAttrs.set("father", new StrTerm("Mark"));
  const o2 = mg.insertFact({ relation: "father", attrs: fAttrs });

  trace(o2[0].rec.relation);
  trace((o2[0].rec.attrs.get("grandchild") as StrTerm).val);
  trace((o2[0].rec.attrs.get("grandfather") as StrTerm).val);

  return o2.length;
}
// console.log(out);

test();
