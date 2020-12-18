// TODO: ...

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

type NodeID = string;

class Insertion {
  origin: NodeID | null; // null: inserted from outside
  destination: NodeID;
  res: Res;
}

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

  // idk man
  insertFact(rec: Rec): Res[] {
    this.queue.push({
      origin: null,
      destination: rec.relation,
      res: { rec, bindings: new Map<string, Term>() },
    });
    const out: Res[] = [];
    while (this.queue.length > 0) {
      const ins = this.queue.shift();
      switch (ins.destination) {
        case "mother":
          this.insert_mother(ins);
          break;
        case "father":
          this.insert_father(ins);
          break;
        case "0":
          this.insert_0(ins);
          break;
        case "1":
          this.insert_1(ins);
          break;
        case "2":
          this.insert_2(ins);
          break;
        case "matGramp":
          const out_matGramp = this.insert_matGramp(ins);
          for (let o of out_matGramp) {
            out.push(o);
          }
          break;
      }
    }
    return out;
  }

  insert_mother(ins: Insertion): void {
    this.queue.push({ destination: "0", origin: "mother", res: ins.res });
  }

  insert_father(ins: Insertion): void {
    this.queue.push({ destination: "1", origin: "father", res: ins.res });
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
      destination: "2",
      origin: "0",
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
      destination: "2",
      origin: "1",
      res: res,
    });
  }

  insert_2(ins: Insertion): void {
    if (ins.origin === "1") {
      // TODO: use index
      for (let item_0 of this.cache_0) {
        if (item_0.bindings.get("B") === ins.res.bindings.get("B")) {
          const bindings = new Map<string, Term>();
          bindings.set("A", item_0.bindings.get("A"));
          bindings.set("B", ins.res.bindings.get("B"));
          bindings.set("C", ins.res.bindings.get("C"));
          this.queue.push({
            destination: "matGramp",
            origin: "2",
            res: { rec: null, bindings },
          });
        }
      }
    } else if (ins.origin === "0") {
      for (let item_1 of this.cache_1) {
        if (item_1.bindings.get("B") === ins.res.bindings.get("B")) {
          const bindings = new Map<string, Term>();
          bindings.set("A", ins.res.bindings.get("A"));
          bindings.set("B", ins.res.bindings.get("B"));
          bindings.set("C", item_1.bindings.get("C"));
          this.queue.push({
            destination: "matGramp",
            origin: "2",
            res: {
              rec: null,
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
    attrs.set("child", ins.res.bindings.get("A"));
    attrs.set("grandfather", ins.res.bindings.get("C"));
    const rec: Rec = { relation: "matGramp", attrs };
    const res: Res = { rec, bindings: ins.res.bindings };
    out.push(res);
    return out;
  }
}

const mg = new MatGramp();
const mAttrs = new Map<string, Term>();
mAttrs.set("child", new StrTerm("Pete"));
mAttrs.set("mother", new StrTerm("Mary"));
mg.insertFact({ relation: "mother", attrs: mAttrs });

const fAttrs = new Map<string, Term>();
fAttrs.set("child", new StrTerm("Mary"));
fAttrs.set("father", new StrTerm("Mark"));
const out = mg.insertFact({ relation: "father", attrs: fAttrs });
console.log(out);
