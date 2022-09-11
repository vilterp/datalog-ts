import React from "react";
import { ppt } from "../../../core/pretty";
import { Res } from "../../../core/types";
import { range } from "../../../util/util";
import { TD_STYLES } from "../../explorer/styles";
import { BareTerm } from "../replViews";
import { Grid } from "./parallelCoords";

export function ResultsParallelCoordsView(props: { grid: Grid }) {
  return (
    <>
      {range(props.grid.longest).map((idx) => {
        return (
          <tr>
            <td colSpan={3} />
            {props.grid.vars.map((varName) => {
              const value = props.grid.grid[varName][idx];
              return (
                <td style={TD_STYLES}>
                  {value ? <BareTerm term={value} /> : null}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

export function ResultsNormalView(props: { vars: string[]; results: Res[] }) {
  return (
    <>
      {props.results.map((result, idx) => {
        return (
          <tr key={idx}>
            <td colSpan={3} />
            {props.vars.map((varName) => {
              const value = result.bindings[varName];
              return (
                <td
                  key={varName}
                  style={TD_STYLES}
                  data-var={varName}
                  data-val={value ? ppt(value) : null}
                >
                  {value ? <BareTerm term={value} /> : null}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
