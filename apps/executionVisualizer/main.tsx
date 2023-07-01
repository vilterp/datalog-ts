import React from "react";
import ReactDOM from "react-dom";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { initialEditorState } from "../../uiCommon/ide/types";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { Explorer } from "../../uiCommon/explorer";
import { stepAndRecord } from "./stepAndRecord";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { LOADER } from "./dl";
// @ts-ignore
import EXAMPLE_BB from "../../languageWorkbench/languages/basicBlocks/example.txt";

function Main() {
  // TODO: get local storage for editor state again
  // const [state, dispatch] = useReducer(update, initialState);
  const [editorState, setEditorState] = useJSONLocalStorage(
    "foo",
    initialEditorState(EXAMPLE_BB)
  );
  const initInterp: AbstractInterpreter = new IncrementalInterpreter(
    ".",
    LOADER
  );
  const [state, interp, error] = stepAndRecord(initInterp, editorState.source);

  return (
    <>
      <h1>Execution Visualizer</h1>

      <LingoEditor
        langSpec={LANGUAGES.basicBlocks}
        editorState={editorState}
        setEditorState={(newEditorState) => setEditorState(newEditorState)}
      />

      {error ? <pre style={{ color: "red" }}>{error}</pre> : null}

      <CollapsibleWithHeading
        heading="Trace"
        content={<Explorer interp={interp} showViz />}
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
