import React, { useEffect, useState, useReducer } from "react";
import ReactDOM from "react-dom";
import { Interpreter } from "../interpreter";
import { nullLoader } from "../loaders";
import { Program } from "../types";
import { language } from "../parser";
// @ts-ignore
import familyDL from "../testdata/family.dl";
import { TabbedTables } from "../uiCommon/tabbedTables";
import useLocalStorage from "react-use-localstorage";
import { ToServer, ToClient } from "../server/protocol";

type WebSocketState =
  | { type: "Connecting" }
  | { type: "Open"; socket: WebSocket }
  | { type: "Closed" }
  | { type: "Errored"; err: string };

function send(socket: WebSocket, msg: ToServer) {
  socket.send(JSON.stringify(msg));
}

function Main() {
  const [source, setSource] = useLocalStorage("datalog-ui-source", "");
  const [wsState, setWSState] = useState<WebSocketState>({
    type: "Connecting",
  });
  const [interp, dispatch] = useReducer((interp, stmt) => {
    const [_, newInterp] = interp.evalStmt(stmt);
    return newInterp;
  }, new Interpreter(".", nullLoader));

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.addEventListener("open", () => {
      setWSState({ type: "Open", socket: ws });
    });
    ws.addEventListener("message", (evt) => {
      const msg = JSON.parse(evt.data) as ToClient;
      switch (msg.type) {
        case "Broadcast":
          dispatch(msg.body);
          return;
        case "Error":
          console.error("error from server", msg.msg);
          return;
      }
    });
    ws.addEventListener("close", () => {
      setWSState({ type: "Closed" });
    });
    ws.addEventListener("error", (evt) => {
      setWSState({ type: "Errored", err: evt.toString() });
    });
  }, []);

  let error: string = null;
  let prog: Program = null;

  try {
    prog = language.program.tryParse(source) as Program;
  } catch (e) {
    error = e.toString();
  }

  return (
    <div>
      <h1>Datalog Fiddle</h1>
      <p>WS State: {wsState.type}</p>
      <textarea
        onChange={(evt) => setSource(evt.target.value)}
        value={source}
        style={{ fontFamily: "monospace" }}
        cols={50}
        rows={10}
      />
      <br />
      <button
        disabled={wsState.type !== "Open" && !error}
        onClick={() => {
          if (wsState.type !== "Open") {
            return;
          }
          prog.forEach((stmt) => {
            send(wsState.socket, { type: "Statement", body: stmt });
          });
          wsState.socket.send(JSON.stringify({}));
        }}
      >
        Send
      </button>
      <br />
      {error ? (
        <>
          <h3>Error</h3>
          <pre style={{ color: "red" }}>{error}</pre>
        </>
      ) : null}
      <h3>Explore</h3>
      <TabbedTables interp={interp} />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
