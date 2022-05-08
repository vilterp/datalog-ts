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

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "datalog-fiddle-editor-state",
    initialEditorState(familyDL)
  );

  let error = null;
  let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);
  try {
    interp = interp.evalStr(editorState.source)[1];
  } catch (e) {
    error = e.toString();
  }

  return (
    <div>
      <h1>Datalog Fiddle</h1>
      <LingoEditor
        langSpec={LANGUAGES.datalog}
        editorState={editorState}
        setEditorState={setEditorState}
        width={800}
        height={1000}
        lineNumbers="on"
        showKeyBindingsTable
      />
      <br />
      {error ? (
        <>
          <h3>Error</h3>
          <pre style={{ fontFamily: "monospace", color: "red" }}>{error}</pre>
        </>
      ) : null}
      <CollapsibleWithHeading
        heading="Explore"
        content={<Explorer interp={interp} showViz />}
      />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
