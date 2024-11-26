import React from "react";
import ReactDOM from "react-dom/client";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { initialEditorState } from "../../uiCommon/ide/types";
import { parseMain } from "../../languageWorkbench/languages/opt/parser";
import ReactJson from "react-json-view";

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "opt-playground-editor-state",
    initialEditorState(LANGUAGES.opt.example)
  );

  const parsed = parseMain(editorState.source);

  return (
    <>
      <h1>Opt Playground</h1>
      <LingoEditor
        langSpec={LANGUAGES.opt}
        editorState={editorState}
        setEditorState={setEditorState}
      />
      <ReactJson
        src={parsed}
        displayDataTypes={false}
        displayObjectSize={false}
        enableClipboard={false}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("main")).render(<Main />);
