// TODO: ...

import { Insertion, Rec, Res, Term } from "./types";

export class MatGramp {
  // TODO: indexes on these relations
  cache_0: {
    all: Res[];
  };
  cache_1: {
    all: Res[];
  };
  cache_matGramp: {
    all: Res[];
  };

  queue: Insertion[];

  constructor() {
    this.queue = [];
    this.cache_0 = {
      all: [],
    };
    this.cache_1 = {
      all: [],
    };
    this.cache_matGramp = {
      all: [],
    };
  }

  // idk man
  insertFact(rec: Rec): Res[] {
    this.queue.push({
      origin: null,
      destination: rec.relation,
      res: { rec, bindings: new Map() },
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

  private insert_mother(ins: Insertion) {
    this.queue.push({ destination: "0", origin: "mother", res: ins.res });
  }

  private insert_father(ins: Insertion) {
    this.queue.push({ destination: "1", origin: "father", res: ins.res });
  }

  private insert_0(ins: Insertion) {
    const bindings = new Map<string, Term>();
    bindings.set("A", ins.res.rec.attrs.child);
    bindings.set("B", ins.res.rec.attrs.mother);
    const res: Res = {
      rec: ins.res.rec,
      bindings,
    };
    this.cache_0.all.push(res);
    this.queue.push({
      destination: "2",
      origin: "0",
      res,
    });
  }

  private insert_1(ins: Insertion) {
    const bindings = new Map<string, Term>();
    bindings.set("B", ins.res.rec.attrs.child);
    bindings.set("C", ins.res.rec.attrs.father);
    const res: Res = {
      rec: ins.res.rec,
      bindings,
    };
    this.cache_1.all.push(res);
    this.queue.push({
      destination: "2",
      origin: "1",
      res: res,
    });
  }

  private insert_2(ins: Insertion) {
    if (ins.origin === "1") {
      // TODO: use index
      for (let item_0 of this.cache_0.all) {
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
      for (let item_1 of this.cache_1.all) {
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

  private insert_matGramp(ins: Insertion): Res[] {
    this.cache_matGramp.all.push(ins.res);
    const out: Res[] = [];
    out.push({
      rec: {
        relation: "matGramp",
        attrs: {
          child: ins.res.bindings.get("A"),
          grandfather: ins.res.bindings.get("C"),
        },
      },
      bindings: ins.res.bindings,
    });
    return out;
  }
}
