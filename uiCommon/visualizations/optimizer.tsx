import * as React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { SimplexSolver } from "../../core/opt/simplex";
import { Int } from "../../core/types";
import { getProblem } from "../../core/opt/convert";

export const optimizer: VizTypeSpec = {
  name: "Optimizer",
  description: "optimize stuff",
  component: (props: VizArgs) => {
    try {
      const problem = getProblem(
        (props.spec.attrs.problem as Int).val,
        props.interp
      );

      console.log("problem", problem);

      const solver = new SimplexSolver(problem);
      const result = solver.solve();

      return <pre>{JSON.stringify(result, null, 2)}</pre>;
    } catch (e) {
      console.error("error in optimizer viz", e);
      return (
        <pre style={{ color: "red" }}>Optimization error: {e.toString()}</pre>
      );
    }
  },
};
