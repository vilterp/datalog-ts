import React from "react";
import ReactDOM from "react-dom";
import { language as fpLanguage, Expr } from "../parser";
import { flatten } from "../flatten";
import { Interpreter } from "../../../core/interpreter";
import { Explorer } from "../../../uiCommon/explorer";
import { Collapsible } from "../../../uiCommon/collapsible";
import { CodeEditor } from "../../../uiCommon/ide/codeEditor";
import { useJSONLocalStorage } from "../../../uiCommon/hooks";
import { initialEditorState } from "../../../uiCommon/ide/types";
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

  const interp2 = interp.doLoad("main.dl");
  // TODO: idk if this is how you're supposed to React. lol
  const [interp3, editor] = CodeEditor({
    interp: interp2,
    parse: fpLanguage.expr,
    flatten,
    getSuggestions,
    highlightCSS,
    state: editorState,
    setState: setEditorState,
  });

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      {editor}

      <Collapsible
        heading="Facts &amp; Rules"
        content={<Explorer interp={interp3} />}
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
