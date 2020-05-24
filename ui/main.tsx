import React, { useState } from "react";
import ReactDOM from "react-dom";
import { ReplCore } from "../replCore";
import { Program, Res } from "../types";
import { prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";
import { language } from "../parser";

function Main() {
  const [source, setSource] = useState("");

  const output: Res[] = [];
  let error = null;

  try {
    const repl = new ReplCore(null); // TODO: some loader
    const program = language.program.tryParse(source) as Program;
    program.forEach((stmt) => {
      repl.evalStmt(stmt).forEach((res) => output.push(res));
    });
  } catch (e) {
    error = e.toString();
  }

  return (
    <div>
      <h1>Datalog Fiddle</h1>
      <textarea
        onChange={(evt) => setSource(evt.target.value)}
        value={source}
        style={{ fontFamily: "monospace" }}
        cols={50}
        rows={10}
      />
      <br />
      {error ? (
        <>
          <h3>Error</h3>
          <pre>{error}</pre>
        </>
      ) : null}
      <pre>
        {output
          .map((res) => pp.render(100, prettyPrintTerm(res.term)))
          .join("\n")}
      </pre>
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
