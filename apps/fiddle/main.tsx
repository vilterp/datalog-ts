import React from "react";
import ReactDOM from "react-dom";
// @ts-ignore
import familyDL from "../../core/testdata/family_rules.dl";
import { Explorer } from "../../uiCommon/explorer";
import { initialEditorState } from "../../uiCommon/ide/types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { LingoEditor } from "../../uiCommon/ide/editor";

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "datalog-fiddle-editor-state",
    initialEditorState(LANGUAGES.datalog, familyDL)
  );

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
      {/* {error ? (
        <>
          <h3>Error</h3>
          <pre style={{ fontFamily: "monospace", color: "red" }}>{error}</pre>
        </>
      ) : null} */}
      <CollapsibleWithHeading
        heading="Explore"
        content={<Explorer interp={editorState.interp} showViz />}
      />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
