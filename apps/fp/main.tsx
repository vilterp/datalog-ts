import React from "react";
import ReactDOM from "react-dom";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { initialEditorState } from "../../uiCommon/ide/types";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { addCursor, constructInterp } from "../../languageWorkbench/interp";
import { LOADER } from "../../languageWorkbench/commonDL";

const INIT_INTERP = new SimpleInterpreter(".", LOADER);

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "fp-editor-state",
    initialEditorState("let x = 2 in intToString(x)")
  );

  const { interp: withoutCursor } = constructInterp(
    INIT_INTERP,
    LANGUAGES.fp,
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
