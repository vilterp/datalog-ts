import { Rule } from "../types";
import { block, emit, loop, LoopNode } from "./loopIR";

export function plan(rule: Rule): LoopNode {
  let loopVar = 0;
  return block(
    rule.body.disjuncts.map((disjunct) =>
      disjunct.conjuncts.reduceRight(
        (accum, conjunct) =>
          loop(
            `record${loopVar++}`,
            {
              relationName:
                // TODO: actually support negation and aggregation
                conjunct.type === "Record"
                  ? conjunct.relation
                  : conjunct.type === "Aggregation"
                  ? conjunct.record.relation
                  : conjunct.record.relation,
              arguments: [],
              indexLookup: null,
            },
            accum
          ),
        emit(rule.head)
      )
    )
  );
}

function error(msg: string) {
  throw new Error(msg);
}
