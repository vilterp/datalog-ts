import React, { useState } from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
// @ts-ignore
import familyDL from "../../core/testdata/family_rules.dl";
import { Explorer } from "../../uiCommon/explorer";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { WrappedCodeEditor } from "../../uiCommon/ide/datalogPowered/wrappedCodeEditor";
import { initialEditorState } from "../../uiCommon/ide/types";
import { LANGUAGES } from "../languageWorkbench/languages";
// @ts-ignore
import commonThemeCSS from "../languageWorkbench/commonTheme.css";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";

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
      <WrappedCodeEditor
        datalog={LANGUAGES.datalog.datalog}
        grammar={LANGUAGES.datalog.grammar}
        highlightCSS={commonThemeCSS}
        lang="datalog"
        editorState={editorState}
        setEditorState={setEditorState}
      />
      <br />
      {error ? (
        <>
          <h3>Error</h3>
          <pre style={{ fontFamily: "monospace", color: "red" }}>{error}</pre>
        </>
      ) : null}
      <h3>Explore</h3>
      <Explorer interp={interp} showViz />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
