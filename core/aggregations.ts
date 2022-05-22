import { int, Term } from "./types";

type Aggregation = (terms: Term[]) => Term;

export const AGGREGATIONS: { [name: string]: Aggregation } = {
  sum: (terms: Term[]) => {
    let result = 0;
    terms.forEach((term) => {
      if (term.type === "IntLit") {
        result += term.val;
      }
    });
    return int(result);
  },
};
