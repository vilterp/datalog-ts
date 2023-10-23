import * as React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";

export const optimizer: VizTypeSpec = {
  name: "Optimizer",
  description: "optimize stuff",
  component: (props: VizArgs) => {
    return <div>Optimizer</div>;
  },
};
