import React from "react";
import ReactDOM from "react-dom/client";
import { Explorer } from "../../uiCommon/explorer";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { initialEditorState } from "../../uiCommon/ide/types";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { addCursor } from "../../languageWorkbench/interpCache";
import { CACHE } from "../../languageWorkbench/vscode/common";

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "fp-editor-state",
    initialEditorState("let x = 40 in plus2(y)")
  );

  const { interp: withoutCursor } = CACHE.getInterpForDoc(
    "fp",
    { fp: LANGUAGES.fp },
    "test.fp",
    editorState.source
  );
  const interp = addCursor(withoutCursor, editorState.cursorPos);

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <LingoEditor
        editorState={editorState}
        setEditorState={setEditorState}
        langSpec={LANGUAGES.fp}
        showKeyBindingsTable
      />
      <CollapsibleWithHeading
        heading="Facts &amp; Rules"
        content={<Explorer interp={interp} />}
      />
      {/* TODO: tree viz in explorer to show AST */}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("main")).render(<Main />);
