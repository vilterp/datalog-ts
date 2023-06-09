import React, { useReducer, useState } from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { nullLoader } from "../../core/loaders";
import { Statement } from "../../core/types";
import { Explorer } from "../../uiCommon/explorer";
// @ts-ignore
import execDL from "./execution.dl";

const emptyInterp = new IncrementalInterpreter(".", nullLoader);
const loadedInterp = emptyInterp.evalStr(execDL)[1];

function Main() {
  const [interp, dispatch] = useReducer(
    (state: IncrementalInterpreter, action: Statement[]) =>
      state.evalRawStmts(action)[1],
    loadedInterp
  );

  return (
    <>
      <h1>Race Detector</h1>
      <Explorer
        interp={interp}
        runStatements={(stmts) => {
          dispatch(stmts);
        }}
        showViz
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
