import React, { useState } from "react";
import { IndividualViz } from ".";
import { Int, int, Rec, Var } from "../../core/types";
import { substitute } from "../../core/unify";
import { VizArgs, VizTypeSpec } from "./typeSpec";

export const paramSlider: VizTypeSpec = {
  name: "Param Slider",
  description:
    "render an inner visualization at different values of a parameter",
  component: ParamSlider,
};

function ParamSlider(props: VizArgs) {
  const [paramValue, setParamValue] = useState<number>(0);

  const subs: { [varName: string]: Int } = {
    [(props.spec.attrs.var as Var).name]: int(paramValue),
  };

  return (
    <div>
      Value: {paramValue}
      <input
        type="range"
        min={0}
        max={100}
        value={paramValue}
        onChange={(evt) => setParamValue(parseFloat(evt.target.value))}
      />
      <IndividualViz
        name={`${props.id}-inner`}
        interp={props.interp}
        highlightedTerm={props.highlightedTerm}
        setHighlightedTerm={props.setHighlightedTerm}
        runStatements={props.runStatements}
        spec={substitute(props.spec.attrs.inner as Rec, subs) as Rec}
      />
    </div>
  );
}
