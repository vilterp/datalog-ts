import React, { useReducer, useState } from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { Statement } from "../../core/types";
import { Explorer } from "../../uiCommon/explorer";
import { loader } from "./dl";

const emptyInterp = new IncrementalInterpreter(".", loader);
const loadedInterp = emptyInterp.doLoad("main.dl");

function Main() {
  const [interp, dispatch] = useReducer(
    (state: IncrementalInterpreter, action: Statement[]) =>
      state.evalRawStmts(action)[1],
    loadedInterp
  );

  return (
    <>
      <h1>Simulator</h1>
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
