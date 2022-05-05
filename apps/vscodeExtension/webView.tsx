import React from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { MessageToWebView } from "./types";

export function Main() {
  const interp = new SimpleInterpreter(".", nullLoader);

  // TODO: subscribe to messages; put into interpreter...

  return <Explorer interp={interp} />;
}

ReactDOM.render(<Main />, document.getElementById("main"));

window.addEventListener("message", (evt) => {
  const msg = evt.data as MessageToWebView;
  switch (msg.type) {
    case "ContentsUpdated":
      console.log("message:", msg.text);
      break;
    default:
      console.log("unknown message:", msg);
      break;
  }
});
