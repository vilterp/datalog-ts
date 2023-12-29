import React from "react";
import ReactDOM from "react-dom";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { initialEditorState } from "../../uiCommon/ide/types";

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "opt-playground-editor-state",
    initialEditorState(LANGUAGES.opt.example)
  );

  return (
    <>
      <h1>Opt Playground</h1>
      <LingoEditor
        langSpec={LANGUAGES.opt}
        editorState={editorState}
        setEditorState={setEditorState}
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
