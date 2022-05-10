import React from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
// @ts-ignore
import familyDL from "../../core/testdata/family_rules.dl";
import { Explorer } from "../../uiCommon/explorer";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { initialEditorState } from "../../uiCommon/ide/types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { addCursor, constructInterp } from "../../languageWorkbench/interp";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "datalog-fiddle-editor-state",
    initialEditorState(familyDL)
  );

  // let error = null;
  // let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);
  // try {
  //   interp = interp.evalStr(editorState.source)[1];
  // } catch (e) {
  //   error = e.toString();
  // }
  const withoutCursor = constructInterp(
    INIT_INTERP,
    LANGUAGES.datalog,
    editorState.source
  ).interp;
  const interp = addCursor(withoutCursor, editorState.cursorPos);

  return (
    <div>
      <h1>Datalog Fiddle</h1>
      <LingoEditor
        langSpec={LANGUAGES.datalog}
        editorState={editorState}
        setEditorState={setEditorState}
        width={800}
        height={500}
        lineNumbers="on"
        showKeyBindingsTable
      />
      <br />
      <CollapsibleWithHeading
        heading="Explore"
        content={<Explorer interp={interp} showViz />}
      />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
