import React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { Rec } from "../../core/types";
import { ppt } from "../../core/pretty";

export const multiSlider: VizTypeSpec = {
  name: "MultiSlider",
  description:
    "render an inner visualization at different values of a parameter",
  component: MultiSlider,
};

const BORDER_STYLE = "1px solid lightgrey";

function MultiSlider(props: VizArgs) {
  const varRecs = props.interp.queryRec(props.spec.attrs.vars as Rec);

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
              {ppt(res.bindings.ID)}
            </td>
            <td>{ppt(res.bindings.Val)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
