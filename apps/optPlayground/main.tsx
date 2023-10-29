import React, { useReducer } from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { Statement } from "../../core/types";
import { Explorer } from "../../uiCommon/explorer";
import { loader } from "./dl";

const emptyInterp = new IncrementalInterpreter(".", loader);
const loadedInterp = emptyInterp.doLoad("opt.dl");

function Main() {
  const [interp, dispatch] = useReducer(
    (state: IncrementalInterpreter, action: Statement[]) =>
      state.evalRawStmts(action)[1],
    loadedInterp
  );

  return (
    <>
      <h1>Optimization Playground</h1>
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
