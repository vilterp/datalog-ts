import React from "react";
import ReactDOM from "react-dom";
import { language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { Interpreter } from "../../incremental/interpreter";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import { Collapsible } from "../../uiCommon/collapsible";
import { CodeEditor } from "../../uiCommon/ide/codeEditor";
import { useJSONLocalStorage } from "../../uiCommon/hooks";
import { initialEditorState } from "../../uiCommon/ide/types";
// @ts-ignore
import highlightCSS from "./highlight.css";
import { loader } from "../dl";
import { getSuggestions } from "./suggestions";

const interp = new Interpreter(loader);
interp.doLoad("./main.dl");

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "editor-state",
    initialEditorState("let x = 2 in intToString(x)")
  );

  // TODO: idk if this is how you're supposed to React. lol

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <CodeEditor
        interp={interp}
        parse={fpLanguage.expr}
        flatten={flatten}
        getSuggestions={getSuggestions}
        highlightCSS={highlightCSS}
        state={editorState}
        setState={setEditorState}
      />

      {/*<Collapsible*/}
      {/*  heading="Facts &amp; Rules"*/}
      {/*  content={<TabbedTables interp={interp3} />}*/}
      {/*/>*/}

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
