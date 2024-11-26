import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { MessageFromWebView, MessageToWebView } from "./types";

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
          console.warn("unknown message:", msg);
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
      {error ? <pre style={{ color: "red" }}>{error}</pre> : null}
      <Explorer interp={interp} showViz />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("main")).render(<Main />);

// let the other side know we're ready
// @ts-ignore
const vscode = acquireVsCodeApi();
const msg: MessageFromWebView = { type: "ReadyForMessages" };
vscode.postMessage(msg);
