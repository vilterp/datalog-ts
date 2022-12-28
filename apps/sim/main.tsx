import React, { useState } from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { nullLoader } from "../../core/loaders";
import { Explorer } from "../../uiCommon/explorer";
// @ts-ignore
import simDL from "./dl/sim.dl";

const emptyInterp = new IncrementalInterpreter(".", nullLoader);
const loadedInterp = emptyInterp.evalStr(simDL)[1];

function Main() {
  const [interp, setInterp] = useState(loadedInterp);

  return (
    <>
      <h1>Simulator</h1>
      <Explorer
        interp={interp}
        runStatements={(stmts) => {
          setInterp(interp.evalRawStmts(stmts)[1]);
        }}
        // showViz
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
