import React from "react";
import { ppr, ppt } from "../../../core/pretty";
import { Res, Rule, Term } from "../../../core/types";
import {
  adjacentPairs,
  filterMap,
  flatMap,
  groupBy,
  range,
  sum,
} from "../../../util/util";
import { TD_STYLES } from "../../explorer/styles";
import { BareTerm } from "../replViews";

export function ResultsParallelCoordsView(props: {
  grid: Grid;
  hoveredResults: Res[];
  setHoveredResults: (results: Res[]) => void;
}) {
  return (
    <>
      {range(props.grid.longest).map((idx) => {
        return (
          <tr key={idx}>
            <td colSpan={3} />
            {props.grid.vars.map((varName) => {
              const item = props.grid.grid[varName][idx];
              return (
                <td
                  style={TD_STYLES}
                  key={varName}
                  onMouseOver={() => {
                    console.log(
                      "setHoveredResults",
                      (item ? item.results : []).map(ppr)
                    );
                    props.setHoveredResults(item ? item.results : []);
                  }}
                  onMouseOut={() => props.setHoveredResults([])}
                >
                  {item ? <BareTerm term={item.term} /> : null}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

export function ResultsParallelCoordsOverlay(props: {
  rule: Rule;
  results: Res[];
  grid: Grid;
  posMap: PositionMap;
  hoveredResults: Res[];
}) {
  if (Object.keys(props.posMap.cells).length === 0) {
    return <svg></svg>;
  }

  return (
    <svg width={props.posMap.tableWidth} height={props.posMap.tableHeight}>
      <g>
        {props.results.map((res, resIdx) => {
          return (
            <OverlayLine
              key={resIdx}
              grid={props.grid}
              res={res}
              selected={false}
              posMap={props.posMap}
            />
          );
        })}
      </g>
      <g className="selected">
        {props.hoveredResults.map((res, resIdx) => (
          <OverlayLine
            key={resIdx}
            grid={props.grid}
            res={res}
            posMap={props.posMap}
            selected
          />
        ))}
      </g>
    </svg>
  );
}

function OverlayLine(props: {
  grid: Grid;
  res: Res;
  selected: boolean;
  posMap: PositionMap;
}) {
  const res = props.res;
  const resultVars = props.grid.vars.filter(
    (varName) => !!res.bindings[varName]
  );
  const varPairs = adjacentPairs(resultVars);
  return (
    <g>
      {filterMap(varPairs, (varPair) => {
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
            key={`${varPair.from}-${varPair.to}`}
            x1={fromPoint.x}
            y1={fromPoint.y}
            x2={toPoint.x}
            y2={toPoint.y}
            style={{
              stroke: props.selected ? "red" : "lightgrey",
              strokeWidth: 2,
            }}
          />
        );
      })}
    </g>
  );
}

export type Grid = {
  grid: { [varName: string]: { term: Term; results: Res[] }[] };
  reverseIndex: { [varName: string]: ValToIdx };
  vars: string[];
  longest: number;
};

type ValToIdx = { [val: string]: number };

export function buildGrid(vars: string[], results: Res[]): Grid {
  const grid: { [varName: string]: { term: Term; results: Res[] }[] } = {};
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
      grid[varName].push({ term, results: [res] });
    });
  });
  let longest = 0;
  vars.forEach((varName) => {
    const grouped = groupBy(grid[varName], (item) => ppt(item.term));
    grid[varName] = Object.values(grouped).map((items) => ({
      term: items[0].term,
      results: flatMap(items, (item) => item.results),
    }));
    // update longest
    const length = Object.keys(grouped).length;
    if (length > longest) {
      longest = length;
    }
    // update reverse index
    const idxForVar: ValToIdx = {};
    reverseIndex[varName] = idxForVar;
    Object.keys(grouped).forEach((printed, idx) => {
      idxForVar[printed] = idx;
    });
  });
  const res = { grid, longest, vars, reverseIndex };
  console.log("grid", res);
  return res;
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
