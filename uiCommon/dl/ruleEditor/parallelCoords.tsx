import React from "react";
import { ppt } from "../../../core/pretty";
import { Res, Rule, Term } from "../../../core/types";
import { range } from "../../../languageWorkbench/parserlib/types";
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
  posMap: PositionMap;
}) {
  const varPairs = adjacentPairs(props.grid.vars);
  if (Object.keys(props.posMap.cells).length === 0) {
    return <svg></svg>;
  }

  return (
    <svg width={props.posMap.tableWidth} height={props.posMap.tableHeight}>
      {props.results.map((res, resIdx) => {
        return filterMap(varPairs, (varPair) => {
          const fromVal = res.bindings[varPair.from];
          const toVal = res.bindings[varPair.to];

          if (!fromVal || !toVal) {
            return null;
          }

          const fromRow = props.grid.reverseIndex[varPair.from][ppt(fromVal)];
          const toRow = props.grid.reverseIndex[varPair.to][ppt(toVal)];

          const fromPoint = props.posMap.cells[varPair.from][fromRow];
          const toPoint = props.posMap.cells[varPair.to][toRow];

          return (
            <line
              key={`${resIdx}-${varPair.from}-${varPair.to}`}
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
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
  return {
    col: 1, // skip fist 3-colspan td
    row: numConjuncts + numDisjuncts + 1, // 1 for 'add disjunct' row
  };
}

type Point = { x: number; y: number };

export type PositionMap = {
  tableWidth: number;
  tableHeight: number;
  cells: { [varName: string]: Point[] };
};

export const emptyPositionMap: PositionMap = {
  cells: {},
  tableHeight: 0,
  tableWidth: 0,
};

export function getPositionMap(
  rule: Rule,
  grid: Grid,
  table: HTMLTableElement
): PositionMap {
  const { row: startRow, col: startCol } = beginningCoords(rule);
  const tableRect = table.getBoundingClientRect();
  const out: PositionMap = {
    cells: {},
    tableHeight: tableRect.height,
    tableWidth: tableRect.width,
  };
  grid.vars.forEach((varName, varIdx) => {
    out.cells[varName] = [];
    grid.grid[varName].forEach((_, termIdx) => {
      const rowIdx = startRow + termIdx;
      const colIdx = startCol + varIdx;
      const tbody = table.children[1];
      const el = tbody.children[rowIdx].children[colIdx];
      const rect = el.getBoundingClientRect();
      const x = rect.x - tableRect.x;
      const y = rect.y - tableRect.y;
      out.cells[varName].push({
        x: x + rect.width / 2,
        y: y + rect.height / 2,
      });
    });
  });
  return out;
}
