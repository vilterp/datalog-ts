import React from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";

export function Main() {
  const interp = new SimpleInterpreter(".", nullLoader);
  return <Explorer interp={interp} />;
}

ReactDOM.render(<Main />, document.getElementById("main"));
