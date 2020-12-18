type Father = { child: string; father: string };
type Mother = { child: string; father: string };

// TODO: ...
type Res = { rec: Rec; bindings: Map<string, Term> };

type Term = string | Rec;

type Rec = { relation: string; attrs: { [key: string]: Term } };

type NodeID = string;

type Insertion = { origin: NodeID; destination: NodeID; res: Res };

class MatGramp {
  // TODO: indexes on these relations
  cache_father: {
    all: Res[];
  };
  cache_mother: {
    all: Res[];
  };
  cache_0: {
    all: Res[];
  };
  cache_1: {
    all: Res[];
  };
  cache_2: {
    all: Res[];
  };
  cache_matGramp: {
    all: Res[];
  };

  queue: Insertion[];

  constructor() {
    this.queue = [];
    this.cache_father = {
      all: [],
    };
    this.cache_mother = {
      all: [],
    };
    this.cache_0 = {
      all: [],
    };
    this.cache_1 = {
      all: [],
    };
    this.cache_2 = {
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
    this.cache_mother.all.push(ins.res);
    this.queue.push({ destination: "0", origin: "mother", res: ins.res });
  }

  private insert_father(ins: Insertion) {
    this.cache_father.all.push(ins.res);
    this.queue.push({ destination: "1", origin: "father", res: ins.res });
  }

  private insert_0(ins: Insertion) {
    this.cache_0.all.push(ins.res);
    const bindings = new Map<string, Term>();
    bindings.set("A", ins.res.rec.attrs.child);
    bindings.set("B", ins.res.rec.attrs.mother);
    this.queue.push({
      destination: "2",
      origin: "0",
      res: {
        rec: ins.res.rec,
        bindings,
      },
    });
  }

  private insert_1(ins: Insertion) {
    this.cache_1.all.push(ins.res);
    const bindings = new Map<string, Term>();
    bindings.set("B", ins.res.rec.attrs.child);
    bindings.set("C", ins.res.rec.attrs.father);
    this.queue.push({
      destination: "2",
      origin: "1",
      res: {
        rec: ins.res.rec,
        bindings,
      },
    });
  }

  private insert_2(ins: Insertion) {
    this.cache_2.all.push(ins.res);
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
            res: {
              rec: null,
              bindings,
            },
          });
        }
      }
    } else if (ins.origin === "0") {
      for (let item_1 of this.cache_1.all) {
        if (item_1.bindings.get("B") === ins.res.bindings.get("B")) {
          const bindings = new Map<string, Term>();
          bindings.set("A", item_1.bindings.get("A"));
          bindings.set("B", ins.res.bindings.get("B"));
          bindings.set("C", ins.res.bindings.get("C"));
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

function main() {
  const mg = new MatGramp();
  const o1 = mg.insertFact({
    relation: "mother",
    attrs: { child: "Pete", mother: "Mary" },
  });
  console.log({ o1 });
  const o2 = mg.insertFact({
    relation: "father",
    attrs: { child: "Mary", mother: "Mark" },
  });
  console.log({ o2 });
}

main();
