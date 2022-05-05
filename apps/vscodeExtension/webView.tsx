import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { MessageToWebView } from "./types";

export function Main() {
  const [dlSource, setDLSource] = useState("");

  useEffect(() => {
    const listener = (evt) => {
      const msg = evt.data as MessageToWebView;
      switch (msg.type) {
        case "ContentsUpdated":
          setDLSource(msg.text);
          break;
        default:
          console.log("unknown message:", msg);
          break;
      }
    };
    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
    };
  });

  let error = "";
  let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);
  try {
    interp = interp.evalStr(dlSource)[1];
  } catch (e) {
    error = e.toString();
  }

  return (
    <>
      {error ? <pre style={{ backgroundColor: "red" }}>{error}</pre> : null}
      <Explorer interp={interp} />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
