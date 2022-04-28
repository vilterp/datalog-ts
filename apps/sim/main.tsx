import React from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";

const interp = new SimpleInterpreter(".", nullLoader);

function Main() {
  return (
    <>
      <h1>Simulator</h1>
      <Explorer interp={interp} />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
