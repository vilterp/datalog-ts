import React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { Int, Rec, Term, int } from "../../core/types";
import { ppt } from "../../core/pretty";
import { BareTerm } from "../dl/replViews";
import { substitute } from "../../core/unify";

export const multiSlider: VizTypeSpec = {
  name: "MultiSlider",
  description:
    "render an inner visualization at different values of a parameter",
  component: MultiSlider,
};

const BORDER_STYLE = "1px solid lightgrey";

// TODO: make these parameterizable in the viz
const RANGE_MIN = 0;
const RANGE_MAX = 100;

function MultiSlider(props: VizArgs) {
  const template = props.spec.attrs.vars as Rec;
  const varRecs = props.interp.queryRec(template);

  const setVal = (id: Term, oldVal: Term, newVal: Term) => {
    const oldRec = substitute(template, {
      ID: id,
      Val: oldVal,
    }) as Rec;
    const newRec = substitute(template, {
      ID: id,
      Val: newVal,
    }) as Rec;
    props.runStatements([
      { type: "Delete", record: oldRec },
      { type: "Fact", record: newRec },
    ]);
  };

  return (
    <table>
      <thead>
        <tr>
          <th style={{ borderBottom: BORDER_STYLE }}>Var</th>
          <th style={{ borderBottom: BORDER_STYLE }}>Value</th>
        </tr>
      </thead>
      <tbody>
        {varRecs.map((res) => (
          <tr key={ppt(res.bindings.ID)}>
            <td style={{ borderRight: BORDER_STYLE }}>
              <BareTerm term={res.bindings.ID} />
            </td>
            <td>
              <input
                type="range"
                min={RANGE_MIN}
                max={RANGE_MAX}
                value={(res.bindings.Val as Int).val}
                onChange={(evt) =>
                  setVal(
                    res.bindings.ID,
                    res.bindings.Val,
                    int(parseInt(evt.target.value))
                  )
                }
              />
              <BareTerm term={res.bindings.Val} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
