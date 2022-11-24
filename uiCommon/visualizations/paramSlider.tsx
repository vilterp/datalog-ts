import React, { useState } from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";

export const paramSlider: VizTypeSpec = {
  name: "Param Slider",
  description:
    "render an inner visualization at different values of a parameter",
  component: ParamSlider,
};

function ParamSlider(props: VizArgs) {
  const [paramValue, setParamValue] = useState<number>(0);

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
    </div>
  );
}
