import React from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { EditorState, initialEditorState } from "../../uiCommon/ide/types";
import { compileBasicBlocks } from "./compileToDL";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
// @ts-ignore
import EXAMPLE_BB from "../../languageWorkbench/languages/basicBlocks/example.txt";
import { LOADER } from "./dl";
import { Rec, Statement, int, rec, str } from "../../core/types";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { State, initialState, step } from "./interpreter";
import ReactJson from "react-json-view";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { Explorer } from "../../uiCommon/explorer";

function getInterp(input: string): [AbstractInterpreter, string | null] {
  const emptyInterp = new IncrementalInterpreter(".", LOADER);
  const loadedInterp = emptyInterp.doLoad("main.dl");
  try {
    const tree = parseMain(input);
    const records = compileBasicBlocks(tree);
    return [loadedInterp.bulkInsert(records), null];
  } catch (e) {
    console.warn(e);
    return [loadedInterp, e.toString()];
  }
}

function Main() {
  // TODO: get local storage for editor state again
  // const [state, dispatch] = useReducer(update, initialState);
  const [editorState, setEditorState] = useJSONLocalStorage(
    "foo",
    initialEditorState(EXAMPLE_BB)
  );

  let interp: AbstractInterpreter = new IncrementalInterpreter(".", LOADER);
  interp = interp.doLoad("viz.dl");

  const bbMain = parseMain(editorState.source);
  let state = initialState(bbMain);
  for (let t = 0; t < 50; t++) {
    state = step(state);
    interp = dumpState(interp, state);
    console.log("state", t, state);
  }

  return (
    <>
      <h1>Execution Visualizer</h1>

      <LingoEditor
        langSpec={LANGUAGES.basicBlocks}
        editorState={editorState}
        setEditorState={(newEditorState) => setEditorState(newEditorState)}
      />

      <CollapsibleWithHeading
        heading="Trace"
        content={<Explorer interp={interp} />}
      />

      <CollapsibleWithHeading
        heading="End State (JSON)"
        content={<ReactJson src={state} enableClipboard={false} />}
      />
    </>
  );
}

function dumpState(
  interp: AbstractInterpreter,
  state: State
): AbstractInterpreter {
  const records: Rec[] = [];
  Object.entries(state.threadStates).forEach(([threadID, threadState]) => {
    records.push(
      rec("state.ProgramCounter", {
        thread: str(threadID),
        counter: int(threadState.counter),
        time: int(state.timestamp),
        // TODO: make into record
        state: str(threadState.state.type),
      })
    );
  });
  interp = interp.bulkInsert(records);
  return interp;
}

ReactDOM.render(<Main />, document.getElementById("main"));
