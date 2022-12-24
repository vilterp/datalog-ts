import { identity } from "../util/util";
import { Int, int, Term } from "./types";

export const AGGREGATIONS: { [name: string]: Aggregator } = {
  sum: {
    init: int(0),
    step(accum: Term, item: Term): Term {
      return int((accum as Int).val + (item as Int).val);
    },
    final: identity,
  },
  count: {
    init: int(0),
    step(accum: Term, item: Term): Term {
      return int((accum as Int).val + 1);
    },
    final: identity,
  },
};

type Aggregator = {
  init: Term;
  step: (accum: Term, item: Term) => Term;
  final: (accum: Term) => Term;
};
