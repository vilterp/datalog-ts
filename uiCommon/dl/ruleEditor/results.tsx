import React from "react";
import { ppt } from "../../../core/pretty";
import { Res } from "../../../core/types";
import { TD_STYLES } from "../../explorer/styles";
import { BareTerm } from "../replViews";

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
