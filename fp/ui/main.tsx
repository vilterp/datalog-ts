import React, { useState } from "react";
import ReactDOM from "react-dom";
import Editor from "react-simple-code-editor/src/index";
import { Expr, language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { Rec, StringLit } from "../../types";
import { Loader } from "../../repl";
import { ReplCore } from "../../replCore";
import useLocalStorage from "react-use-localstorage";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import ReactJson from "react-json-view";
import { Collapsible } from "../../uiCommon/collapsible";
import { dlToSpan, highlight } from "./highlight";
import { uniqBy } from "../../util";
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
  let error = null;
  let suggestions: { name: string; type: string }[] = [];
  try {
    // insert source
    parsed = fpLanguage.expr.tryParse(source);
    const flattened = flatten(parsed);

    flattened.forEach((rec) =>
      repl.evalStmt({ type: "Insert", record: rec as Rec })
    );

    // get suggestions
    suggestions = getSuggestions(repl);
  } catch (e) {
    error = e.toString();
    console.error(e);
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
          highlight={(_) => highlight(repl, source)}
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
          <div style={{ marginLeft: 15, color: "red" }}>
            <h2>Parse Error</h2>
            <pre>{error}</pre>
          </div>
        ) : null}
        {suggestions ? (
          <ul style={{ fontFamily: "monospace" }}>
            {suggestions.map((s) => (
              <li
                key={`${s.name}-${s.type}`}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setSource(insertSuggestion(repl, source, s.name))
                }
              >
                {s.name}: {s.type}
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

function insertSuggestion(repl: ReplCore, code: string, sugg: string): string {
  const currentPlaceholder = repl.evalStr("current_placeholder{span: S}.")
    .results[0].term as Rec;
  const span = dlToSpan(currentPlaceholder.attrs.span as Rec);
  return (
    code.substring(0, span.from.offset) + sugg + code.substring(span.to.offset)
  );
}

function getSuggestions(repl: ReplCore): { name: string; type: string }[] {
  const suggs = repl
    .evalStr("current_suggestion{name: N, type: T}.")
    .results.map((res) => {
      const rec = res.term as Rec;
      return {
        name: (rec.attrs.name as StringLit).val,
        type: (rec.attrs.type as StringLit).val,
      };
    });
  return uniqBy(suggs, ({ name, type }) => `${name}: ${type}`);
}

ReactDOM.render(<Main />, document.getElementById("main"));
