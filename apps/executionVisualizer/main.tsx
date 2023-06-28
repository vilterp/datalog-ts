import React, { useReducer } from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { EditorState, initialEditorState } from "../../uiCommon/ide/types";
import { compileBasicBlocks } from "./compileToDL";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
// @ts-ignore
import EXAMPLE_BB from "../../languageWorkbench/languages/basicBlocks/example.txt";
import { LOADER } from "./dl";
import { Statement } from "../../core/types";
import useLocalStorage from "react-use-localstorage";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { initialState, step } from "./interpreter";
import ReactJson from "react-json-view";

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

type State = {
  editorState: EditorState;
  interp: AbstractInterpreter;
  statements: Statement[];
  error: string | null;
};

type Action =
  | {
      type: "UpdateEditorState";
      newEditorState: EditorState;
    }
  | { type: "RunStatements"; statements: Statement[] };

function update(state: State, action: Action): State {
  switch (action.type) {
    case "RunStatements": {
      let interp = state.interp;
      action.statements.forEach((stmt) => {
        interp = interp.evalStmt(stmt)[1];
      });
      return {
        ...state,
        interp,
        statements: [...state.statements, ...action.statements],
      };
    }
    case "UpdateEditorState": {
      let [interp, error] = getInterp(action.newEditorState.source);
      state.statements.forEach((stmt) => {
        interp = interp.evalStmt(stmt)[1];
      });
      return {
        ...state,
        editorState: action.newEditorState,
        interp,
        error,
      };
    }
  }
}

// function getInitialState(source: string): State {
//   return {
//     editorState: initialEditorState(source),
//     error: null,
//     interp: getInterp(source)[0],
//     statements: [],
//   };
// }

// const initialState: State = getInitialState(EXAMPLE_BB);

function Main() {
  // TODO: get local storage for editor state again
  // const [state, dispatch] = useReducer(update, initialState);
  const [editorState, setEditorState] = useJSONLocalStorage(
    "foo",
    initialEditorState(EXAMPLE_BB)
  );
  const bbMain = parseMain(editorState.source);
  let state = initialState(bbMain);
  for (let i = 0; i < 50; i++) {
    state = step(state);
    console.log("state", i, state);
  }

  return (
    <>
      <h1>Execution Visualizer</h1>

      <LingoEditor
        langSpec={LANGUAGES.basicBlocks}
        editorState={editorState}
        setEditorState={(newEditorState) => setEditorState(newEditorState)}
      />

      <ReactJson src={state} enableClipboard={false} />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
