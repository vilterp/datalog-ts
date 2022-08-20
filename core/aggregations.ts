import { int, Value } from "./types";

type Aggregation = (terms: Value[]) => Value;

export const AGGREGATIONS: { [name: string]: Aggregation } = {
  sum: (terms: Value[]) => {
    let result = 0;
    terms.forEach((term) => {
      if (term.type === "IntLit") {
        result += term.val;
      }
    });
    return int(result);
  },
};
