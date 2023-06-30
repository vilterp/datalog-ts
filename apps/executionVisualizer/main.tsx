import React from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { initialEditorState } from "../../uiCommon/ide/types";
import { compileBasicBlocks } from "./compileToDL";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
// @ts-ignore
import EXAMPLE_BB from "../../languageWorkbench/languages/basicBlocks/example.txt";
import { LOADER } from "./dl";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { State, initialState, step } from "./interpreter";
import ReactJson from "react-json-view";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { Explorer } from "../../uiCommon/explorer";
import { dumpState } from "./dumpState";
import { int, rec } from "../../core/types";

function getInterp(input: string): [State, AbstractInterpreter, string | null] {
  let interp: AbstractInterpreter = new IncrementalInterpreter(".", LOADER);
  interp = interp.doLoad("viz.dl");

  const bbMain = parseMain(input);
  let state = initialState(bbMain);

  // insert initial state
  state.program.dlInstrs.forEach((instr, idx) => {
    interp = interp.insert(rec("instr", { idx: int(idx), op: instr }));
  });
  interp = dumpState(interp, state);
  try {
    // step program
    for (let t = 0; t < 50; t++) {
      state = step(state);
      interp = dumpState(interp, state);
    }

    return [state, interp, null];
  } catch (e) {
    return [state, interp, e.toString()];
  }
}

function Main() {
  // TODO: get local storage for editor state again
  // const [state, dispatch] = useReducer(update, initialState);
  const [editorState, setEditorState] = useJSONLocalStorage(
    "foo",
    initialEditorState(EXAMPLE_BB)
  );

  const [state, interp, error] = getInterp(editorState.source);

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

      <CollapsibleWithHeading
        heading="End State (JSON)"
        content={<ReactJson src={state} enableClipboard={false} />}
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
