import React from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
// @ts-ignore
import simDL from "./dl/sim.dl";

const emptyInterp = new SimpleInterpreter(".", nullLoader);
const interp = emptyInterp.evalStr(simDL)[1];

function Main() {
  return (
    <>
      <h1>Simulator</h1>
      <Explorer interp={interp} showViz />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
