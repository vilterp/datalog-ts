import React from "react";
import { ppt } from "../../../core/pretty";
import { Res, Rule, Term } from "../../../core/types";
import {
  adjacentPairs,
  filterMap,
  flatMap,
  sum,
  uniqBy,
} from "../../../util/util";

export function ResultsParallelCoordsOverlay(props: {
  rule: Rule;
  results: Res[];
  grid: Grid;
}) {
  const varPairs = adjacentPairs(props.grid.vars);
  const baseCoords = beginningCoords(props.rule);

  return (
    <svg style={{ gridRow: 1, gridColumn: 1 }}>
      {props.results.map((res) => {
        return filterMap(varPairs, (varPair, varIdx) => {
          const fromVal = res.bindings[varPair.from];
          const toVal = res.bindings[varPair.to];

          if (!fromVal || !toVal) {
            return null;
          }

          const fromRow = props.grid.reverseIndex[varPair.from][ppt(fromVal)];
          const fromCol = varIdx;
          const toRow = props.grid.reverseIndex[varPair.to][ppt(toVal)];
          const toCol = varIdx + 1;

          return (
            <line
              x1={fromCol * 10}
              y1={fromRow * 10}
              x2={toCol * 10}
              y2={toRow * 10}
              style={{ stroke: "rgb(255,0,0)", strokeWidth: 2 }}
            />
          );
        });
      })}
    </svg>
  );
}

export type Grid = {
  grid: { [varName: string]: Term[] };
  reverseIndex: { [varName: string]: ValToIdx };
  vars: string[];
  longest: number;
};

type ValToIdx = { [val: string]: number };

export function buildGrid(vars: string[], results: Res[]): Grid {
  const grid: { [varName: string]: Term[] } = {};
  const reverseIndex: { [varName: string]: ValToIdx } = {};
  vars.forEach((varName) => {
    grid[varName] = [];
  });
  results.forEach((res) => {
    vars.forEach((varName) => {
      const term = res.bindings[varName];
      if (!term) {
        return;
      }
      grid[varName].push(term);
    });
  });
  let longest = 0;
  vars.forEach((varName) => {
    const unique = uniqBy(ppt, grid[varName]);
    grid[varName] = unique;
    // update longest
    if (unique.length > longest) {
      longest = unique.length;
    }
    // update reverse index
    const idxForVar: ValToIdx = {};
    reverseIndex[varName] = idxForVar;
    unique.forEach((val, idx) => {
      const printed = ppt(val);
      idxForVar[printed] = idx;
    });
  });
  return { grid, longest, vars, reverseIndex };
}

// starting at (0, 0)
function beginningCoords(rule: Rule): { row: number; col: number } {
  const numDisjuncts = rule.body.disjuncts.length;
  const numConjuncts = sum(
    rule.body.disjuncts.map((dj) => dj.conjuncts.length)
  );
  return { col: 3, row: numConjuncts + numDisjuncts };
}
