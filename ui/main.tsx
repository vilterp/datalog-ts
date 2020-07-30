import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Interpreter } from "../interpreter";
import { nullLoader } from "../loaders";
import { Program } from "../types";
import { language } from "../parser";
// @ts-ignore
import familyDL from "../testdata/family.dl";
import { TabbedTables } from "../uiCommon/tabbedTables";
import useLocalStorage from "react-use-localstorage";
import { ToServer } from "../server/protocol";

type WebSocketState =
  | { type: "Connecting" }
  | { type: "Open"; socket: WebSocket }
  | { type: "Closed" }
  | { type: "Errored"; err: string };

function send(socket: WebSocket, msg: ToServer) {
  socket.send(JSON.stringify(msg));
}

function Main() {
  const [source, setSource] = useState("");
  const [wsState, setWSState] = useState<WebSocketState>({
    type: "Connecting",
  });

  useEffect(() => {
    console.log("ws connect");
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    ws.addEventListener("open", () => {
      setWSState({ type: "Open", socket: ws });
    });
    ws.addEventListener("message", (evt) => {
      console.log("ws message", evt);
    });
    ws.addEventListener("close", () => {
      setWSState({ type: "Closed" });
    });
    ws.addEventListener("error", (evt) => {
      setWSState({ type: "Errored", err: evt.toString() });
    });
  }, []);

  let error = null;
  let program = [];

  const interp = new Interpreter(".", nullLoader);
  let interp2: Interpreter = null;
  try {
    program = language.program.tryParse(source) as Program;
    interp2 = program.reduce<Interpreter>(
      (interp, stmt) => interp.evalStmt(stmt)[1],
      interp
    );
  } catch (e) {
    error = e.toString();
    interp2 = interp;
  }

  return (
    <div>
      <h1>Datalog Fiddle</h1>
      <p>
        WS State:
        <code>{JSON.stringify(wsState)}</code>
      </p>
      <textarea
        onChange={(evt) => setSource(evt.target.value)}
        value={source}
        style={{ fontFamily: "monospace" }}
        cols={50}
        rows={10}
      />
      <br />
      <button
        disabled={wsState.type !== "Open"}
        onClick={(evt) => {
          if (wsState.type !== "Open") {
            return;
          }
          send(wsState.socket, { type: "Statement", body: program[0] });
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
      <TabbedTables interp={interp2} />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
