import { identity } from "../util/util";
import { Bindings, Dict, dict, Int, int, Rec, rec, Term } from "./types";
import { termLT } from "./unify";

export const AGGREGATIONS: { [name: string]: Aggregator } = {
  sum: {
    init: int(0),
    step(accum: Term, item: Term, count: number): Term {
      return int((accum as Int).val + (item as Int).val * count);
    },
    final: identity,
  },
  count: {
    init: int(0),
    step(accum: Term, item: Term, count: number): Term {
      return int((accum as Int).val + 1 * count);
    },
    final: identity,
  },
  maxBy: {
    init: rec("start", {}),
    step(accum: Term, item: Term, count: number, bindings: Bindings): Term {
      if ((accum as Rec).relation === "start") {
        return rec("started", { max: item, bindings: dict(bindings) });
      }
      const curMax = (accum as Rec).attrs.max;
      if (termLT(curMax, item)) {
        return rec("started", { max: item, bindings: dict(bindings) });
      }
      return accum;
    },
    // not sure this is right...
    final(accum: Term, aggVar: string) {
      if ((accum as Rec).relation === "start") {
        return null; // ???
      }
      return ((accum as Rec).attrs.bindings as Dict).map[aggVar];
    },
  },
};

type Aggregator = {
  init: Term;
  step: (accum: Term, item: Term, count: number, bindings: Bindings) => Term;
  final: (accum: Term, aggVar: string) => Term;
};
