import React from "react";
import ReactDOM from "react-dom";
import { language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { Explorer } from "../../../uiCommon/explorer";
import { CollapsibleWithHeading } from "../../../uiCommon/generic/collapsible";
import { useJSONLocalStorage } from "../../../uiCommon/generic/hooks";
import { initialEditorState } from "../../../uiCommon/ide/types";
// @ts-ignore
import highlightCSS from "./highlight.css";
import { LOADER } from "../dl";
import { getSuggestions } from "./suggestions";
import { IncrementalInterpreter } from "../../../core/incremental/interpreter";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { LingoEditor } from "../../../uiCommon/ide/editor";
import { LANGUAGES } from "../../../languageWorkbench/languages";
import { constructInterp } from "../../../languageWorkbench/interp";

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "fp-editor-state",
    initialEditorState("let x = 2 in intToString(x)")
  );

  const { finalInterp } = constructInterp();

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <LingoEditor
        editorState={editorState}
        setEditorState={setEditorState}
        langSpec={LANGUAGES.fp}
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
