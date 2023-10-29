import * as React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { SimplexSolver } from "../../core/opt/simplex";
import { Int } from "../../core/types";
import { extractSolution, getProblem } from "../../core/opt/convert";
import { ppt } from "../../core/pretty";
import { BareTerm } from "../dl/replViews";

export const optimizer: VizTypeSpec = {
  name: "Optimizer",
  description: "optimize stuff",
  component: (props: VizArgs) => {
    try {
      const problemID = (props.spec.attrs.problem as Int).val;
      const problemAndMapping = getProblem(problemID, props.interp);
      const problem = problemAndMapping.problem;

      console.log("problem", problemAndMapping);

      const solver = new SimplexSolver(problem);
      const result = solver.solve();
      const resultRecords = extractSolution(
        problemID,
        result,
        problemAndMapping.varIndex
      );

      return (
        <ul>
          {resultRecords.map((rec) => (
            <li key={ppt(rec)}>
              <BareTerm term={rec} />
            </li>
          ))}
        </ul>
      );
    } catch (e) {
      console.error("error in optimizer viz", e);
      return (
        <pre style={{ color: "red" }}>Optimization error: {e.toString()}</pre>
      );
    }
  },
};
