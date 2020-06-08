import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Expr, language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { prettyPrintTerm, prettyPrintRule } from "../../pretty";
import * as pp from "prettier-printer";
import { Rec, Res, Rule } from "../../types";
import { Loader } from "../../repl";
// @ts-ignore
import typecheckDL from "../typecheck.dl";
// @ts-ignore
import stdlibDL from "../stdlib.dl";
import { ReplCore } from "../../replCore";
import useLocalStorage from "react-use-localstorage";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import ReactJson from "react-json-view";
import { Collapsible } from "../../uiCommon/collapsible";

const loader: Loader = (path: string) => {
  switch (path) {
    case "typecheck.dl":
      return typecheckDL;
    case "stdlib.dl":
      return stdlibDL;
  }
};

function Main() {
  const [source, setSource] = useLocalStorage(
    "source",
    "let x = 2 in intToString(x)"
  );
  const [cursorPos, setCursorPos] = useState<number>(0);

  const repl = new ReplCore(loader);
  repl.doLoad("typecheck.dl");
  repl.doLoad("stdlib.dl");
  repl.evalStr(`cursor{idx: ${cursorPos}}.`);
  let parsed: Expr = null;
  let rendered: string[] = [];
  let error = null;
  try {
    parsed = fpLanguage.expr.tryParse(source);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    rendered = printed.map((t) => pp.render(100, t) + ".");

    flattened.forEach((rec) =>
      repl.evalStmt({ type: "Insert", record: rec as Rec })
    );
  } catch (e) {
    error = e.toString();
  }

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <div style={{ display: "flex" }}>
        <textarea
          onChange={(evt) => setSource(evt.target.value)}
          onKeyDown={(evt) => {
            setCursorPos(evt.target.selectionStart);
          }}
          onKeyUp={(evt) => {
            setCursorPos(evt.target.selectionStart);
          }}
          onClick={(evt) => {
            setCursorPos(evt.target.selectionStart);
          }}
          style={{ fontFamily: "monospace" }}
          cols={50}
          rows={10}
          value={source}
        />

        {error ? (
          <div style={{ marginLeft: 15, color: "red" }}>
            <h2>Parse Error</h2>
            <pre>{error}</pre>
          </div>
        ) : null}
      </div>

      <TabbedTables repl={repl} />

      <Collapsible
        heading="AST"
        content={
          <ReactJson
            name={null}
            enableClipboard={false}
            displayObjectSize={false}
            displayDataTypes={false}
            src={parsed}
            shouldCollapse={({ name }) => name === "span"}
          />
        }
      />

      <Collapsible
        heading="Flattened AST"
        content={<pre>{rendered.join("\n")}</pre>}
      />

      <Collapsible heading="Rules" content={<pre>{typecheckDL}</pre>} />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
