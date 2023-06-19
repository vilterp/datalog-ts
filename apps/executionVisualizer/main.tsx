import React, { useState } from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { nullLoader } from "../../core/loaders";
import { Explorer } from "../../uiCommon/explorer";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { initialEditorState } from "../../uiCommon/ide/types";
import { compileBasicBlocks } from "./compiler";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
// @ts-ignore
import execDL from "./execution.dl";
// @ts-ignore
import exampleBB from "../../languageWorkbench/languages/basicBlocks/example.txt";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";

function getInterp(input: string): AbstractInterpreter {
  const emptyInterp = new IncrementalInterpreter(".", nullLoader);
  const loadedInterp = emptyInterp.evalStr(execDL)[1];
  const tree = parseMain(input);
  const records = compileBasicBlocks(tree);
  return loadedInterp.bulkInsert(records);
}

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "exec-viz-editor-state",
    initialEditorState(exampleBB)
  );
  const interp = getInterp(editorState.source);

  return (
    <>
      <h1>Execution Visualizer</h1>

      <LingoEditor
        langSpec={LANGUAGES.basicBlocks}
        editorState={editorState}
        setEditorState={setEditorState}
      />

      <Explorer
        interp={interp}
        // runStatements={(stmts) => {
        //   dispatch(stmts);
        // }}
        showViz
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));