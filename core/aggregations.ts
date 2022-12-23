import { Json } from "../util/json";
import { int, Term } from "./types";

export const AGGREGATIONS: { [name: string]: Aggregator } = {
  sum: (terms: Term[]) => {
    let result = 0;
    terms.forEach((term) => {
      if (term.type === "IntLit") {
        result += term.val;
      }
    });
    return int(result);
  },
  count: (terms: Term[]) => {
    return int(terms.length);
  },
};

type Aggregator = {
  init: Term;
  step: (accum: Term, item: Term) => Term;
  final: (accum: Term) => Term;
};
