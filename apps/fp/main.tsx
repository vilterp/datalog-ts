import React from "react";
import ReactDOM from "react-dom";
import { language as fpLanguage } from "./parser";
import { flatten } from "./flatten";
import { Explorer } from "../../uiCommon/explorer";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import {
  CodeEditor,
  loadInterpreter,
} from "../../uiCommon/ide/parsimmonPowered/codeEditor";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { initialEditorState } from "../../uiCommon/ide/types";
// @ts-ignore
import highlightCSS from "./highlight.css";
import { LOADER } from "./dl";
import { getSuggestions } from "./suggestions";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

function Main() {
  let interp = new IncrementalInterpreter(".", LOADER) as AbstractInterpreter;

  const [editorState, setEditorState] = useJSONLocalStorage(
    "fp-editor-state",
    initialEditorState("let x = 2 in intToString(x)")
  );

  interp = interp.doLoad("main.dl");
  const { interp: newInterp, error } = loadInterpreter(
    interp,
    editorState,
    fpLanguage.expr,
    flatten
  );
  interp = newInterp;

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <CodeEditor
        lang="fp"
        interp={interp}
        getSuggestions={getSuggestions}
        highlightCSS={highlightCSS}
        editorState={editorState}
        setEditorState={setEditorState}
        loadError={error}
        autofocus={true}
      />
      <CollapsibleWithHeading
        heading="Facts &amp; Rules"
        content={<Explorer interp={interp} />}
      />
      {/* TODO: tree viz in explorer to show AST */}
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
