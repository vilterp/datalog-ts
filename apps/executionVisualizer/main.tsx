import React from "react";
import ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { initialEditorState } from "../../uiCommon/ide/types";
import { compileBasicBlocks } from "./compiler";
import { parseMain } from "../../languageWorkbench/languages/basicBlocks/parser";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
// @ts-ignore
import exampleBB from "../../languageWorkbench/languages/basicBlocks/example.txt";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { LOADER } from "./dl";

function getInterp(input: string): [AbstractInterpreter, string | null] {
  const emptyInterp = new IncrementalInterpreter(".", LOADER);
  const loadedInterp = emptyInterp.doLoad("main.dl");
  try {
    const tree = parseMain(input);
    const records = compileBasicBlocks(tree);
    return [loadedInterp.bulkInsert(records), null];
  } catch (e) {
    return [loadedInterp, e.toString()];
  }
}

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "exec-viz-editor-state",
    initialEditorState(exampleBB)
  );
  const [interp, err] = getInterp(editorState.source);

  return (
    <>
      <h1>Execution Visualizer</h1>

      <LingoEditor
        langSpec={LANGUAGES.basicBlocks}
        editorState={editorState}
        setEditorState={setEditorState}
      />

      {err ? <pre style={{ color: "red" }}>{err}</pre> : null}

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
