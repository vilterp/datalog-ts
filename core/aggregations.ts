import { identity } from "../util/util";
import { Bindings, Dict, dict, Int, int, Rec, rec, Term } from "./types";
import { termLT } from "./unify";

export const AGGREGATIONS: { [name: string]: Aggregator } = {
  sum: simpleAgg({
    init: int(0),
    step(accum: Term, item: Term, count: number): Term {
      return int((accum as Int).val + (item as Int).val * count);
    },
    final: identity,
  }),
  count: simpleAgg({
    init: int(0),
    step(accum: Term, item: Term, count: number): Term {
      return int((accum as Int).val + 1 * count);
    },
    final: identity,
  }),
  maxBy: {
    init: rec("start", {}),
    step(
      accum: Term,
      config: GroupInfo,
      bindings: Bindings,
      count: number
    ): Term {
      const item = bindings[config.aggVar];
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
    final(accum: Term, config: GroupInfo): Bindings {
      if ((accum as Rec).relation === "start") {
        return null; // ???
      }
      return ((accum as Rec).attrs.bindings as Dict).map;
    },
  },
};

export type GroupInfo = {
  groupBindings: Bindings;
  aggVar: string;
};

type Aggregator = {
  init: Term;
  step: (
    accum: Term,
    config: GroupInfo,
    bindings: Bindings,
    count: number
  ) => Term;
  final: (accum: Term, config: GroupInfo) => Bindings;
};

function simpleAgg(props: {
  init: Term;
  step: (accum: Term, item: Term, count: number) => Term;
  final: (accum: Term) => Term;
}): Aggregator {
  return {
    init: props.init,
    step(accum: Term, config: GroupInfo, bindings: Bindings, count: number) {
      return props.step(accum, bindings[config.aggVar], count);
    },
    final(accum: Term, config: GroupInfo): Bindings {
      const out: Bindings = {};
      for (const varName in config.groupBindings) {
        out[varName] = config.groupBindings[varName];
      }
      out[config.aggVar] = props.final(accum);
      return out;
    },
  };
}
