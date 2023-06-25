import React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";

export const multiSlider: VizTypeSpec = {
  name: "MultiSlider",
  description:
    "render an inner visualization at different values of a parameter",
  component: MultiSlider,
};

function MultiSlider(props: VizArgs) {
  return <p>Hello world</p>;
}
