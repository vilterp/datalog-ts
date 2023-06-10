import React, { useReducer, useState } from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { nullLoader } from "../../core/loaders";
import { Statement } from "../../core/types";
import { Explorer } from "../../uiCommon/explorer";
// @ts-ignore
import execDL from "./execution.dl";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { initialEditorState } from "../../uiCommon/ide/types";

const EXAMPLE = `foo {
  a = 42;
  b = "foo";
  x = boop(a);
  c = group(???);
  goto ???;
}

bar {
  y = boop;
  goto foo;
}
`;

const emptyInterp = new IncrementalInterpreter(".", nullLoader);
const loadedInterp = emptyInterp.evalStr(execDL)[1];

function Main() {
  const [interp, dispatch] = useReducer(
    (state: IncrementalInterpreter, action: Statement[]) =>
      state.evalRawStmts(action)[1],
    loadedInterp
  );
  const [editorState, setEditorState] = useState(initialEditorState(EXAMPLE));

  return (
    <>
      <h1>Race Detector</h1>

      <LingoEditor
        langSpec={LANGUAGES.basicBlocks}
        editorState={editorState}
        setEditorState={setEditorState}
      />

      <Explorer
        interp={interp}
        runStatements={(stmts) => {
          dispatch(stmts);
        }}
        showViz
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
