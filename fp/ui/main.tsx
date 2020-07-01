import React from "react";
import ReactDOM from "react-dom";
import { language as fpLanguage, Expr } from "../parser";
import { flatten } from "../flatten";
import { Interpreter } from "../../interpreter";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import { Collapsible } from "../../uiCommon/collapsible";
import { CodeEditor } from "../../uiCommon/ide/ide";
import { useJSONLocalStorage } from "../../uiCommon/hooks";
import { initialEditorState } from "../../uiCommon/ide/types";
// @ts-ignore
import highlightCSS from "./highlight.css";
import { loader } from "../dl";
import { getSuggestions } from "./suggestions";

function Main() {
  const interp = new Interpreter(".", loader);

  const [editorState, setEditorState] = useJSONLocalStorage(
    "editor-state",
    initialEditorState("let x = 2 in intToString(x)")
  );

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <CodeEditor<Expr>
        interp={interp}
        parse={fpLanguage.expr}
        flatten={flatten}
        dlRulesFile="main.dl"
        getSuggestions={getSuggestions}
        highlightCSS={highlightCSS}
        state={editorState}
        setState={setEditorState}
      />

      <Collapsible
        heading="Facts &amp; Rules"
        content={<TabbedTables interp={interp} />}
      />

      {/* TODO: bring back a good way of displaying the AST */}
      {/* <Collapsible
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
      /> */}
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
