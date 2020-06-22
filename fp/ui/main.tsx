import React, { useState } from "react";
import ReactDOM from "react-dom";
import Editor from "react-simple-code-editor/src/index";
import { Expr, language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { Rec } from "../../types";
import { Loader } from "../../repl";
import { ReplCore } from "../../replCore";
import useLocalStorage from "react-use-localstorage";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import ReactJson from "react-json-view";
import { Collapsible } from "../../uiCommon/collapsible";
import { highlight } from "./highlight";
// @ts-ignore
import highlightCSS from "./highlight.css";
// @ts-ignore
import typecheckDL from "../typecheck.dl";
// @ts-ignore
import ideDL from "../ide.dl";
// @ts-ignore
import stdlibDL from "../stdlib.dl";
// @ts-ignore
import highlightDL from "../highlight.dl";
import {
  getSuggestions,
  insertSuggestion,
  Suggestion,
  typeToString,
} from "./suggestions";

const loader: Loader = (path: string) => {
  switch (path) {
    case "typecheck.dl":
      return typecheckDL;
    case "ide.dl":
      return ideDL;
    case "stdlib.dl":
      return stdlibDL;
    case "highlight.dl":
      return highlightDL;
  }
};

type Error =
  | { type: "ParseError"; expected: string[]; offset: number }
  | { type: "EvalError"; err: Error };

function Main() {
  const [source, setSource] = useLocalStorage(
    "source",
    "let x = 2 in intToString(x)"
  );
  const [cursorPos, setCursorPos] = useState<number>(0);

  const repl = new ReplCore(loader);
  // TODO: make REPL immutable; always start from one with this stuff loaded
  repl.doLoad("typecheck.dl");
  repl.doLoad("ide.dl");
  repl.doLoad("stdlib.dl");
  repl.doLoad("highlight.dl");
  repl.evalStr(`cursor{idx: ${cursorPos}}.`);
  let parsed: Expr = null;
  let error: Error | null = null;
  let suggestions: Suggestion[] = [];
  const parseRes = fpLanguage.expr.parse(source);
  if (parseRes.status === false) {
    error = {
      type: "ParseError",
      expected: parseRes.expected,
      offset: parseRes.index.offset,
    };
  } else {
    try {
      parsed = parseRes.value;
      const flattened = flatten(parseRes.value);
      flattened.forEach((rec) =>
        repl.evalStmt({ type: "Insert", record: rec as Rec })
      );

      // get suggestions
      suggestions = getSuggestions(repl);
    } catch (e) {
      error = { type: "EvalError", err: e };
    }
  }

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <div style={{ display: "flex" }}>
        <style
          dangerouslySetInnerHTML={{
            __html: highlightCSS,
          }}
        />
        <Editor
          name="wut" // type error without this, even tho optional
          style={{
            fontFamily: "monospace",
            height: 150,
            width: 500,
            backgroundColor: "rgb(250, 250, 250)",
            border: "1px solid black",
            marginBottom: 10,
          }}
          padding={10}
          value={source}
          onValueChange={setSource}
          highlight={(_) =>
            highlight(
              repl,
              source,
              error && error.type === "ParseError" ? error.offset : null
            )
          }
          // highlight={(code) => code}
          onKeyDown={(evt) => {
            setCursorPos(evt.currentTarget.selectionStart);
          }}
          onKeyUp={(evt) => {
            setCursorPos(evt.currentTarget.selectionStart);
          }}
          onClick={(evt) => {
            setCursorPos(evt.currentTarget.selectionStart);
          }}
        />

        {error ? (
          <div
            style={{ fontFamily: "monospace", marginLeft: 15, color: "red" }}
          >
            {error.type === "ParseError"
              ? `Parse error: expected ${error.expected.join(" or ")}`
              : `Eval error: ${error.err}`}
          </div>
        ) : null}
        {suggestions ? (
          <ul style={{ fontFamily: "monospace" }}>
            {suggestions.map((sugg) => (
              <li
                key={JSON.stringify(sugg)}
                style={{
                  cursor: "pointer",
                  fontWeight: sugg.typeMatch ? "bold" : "normal",
                }}
                onClick={() => setSource(insertSuggestion(repl, source, sugg))}
              >
                {sugg.name}: {typeToString(sugg.type)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Collapsible
        heading="Facts &amp; Rules"
        content={<TabbedTables repl={repl} />}
      />

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
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
