import React, { useState } from "react";
import ReactDOM from "react-dom";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { initialEditorState } from "../../uiCommon/ide/types";

const INIT_SQL = "SELECT * FROM users WHERE id = 123";

function Main() {
  const [sqlEditorState, setSQLEditorState] = useState(
    initialEditorState(INIT_SQL)
  );

  return (
    <>
      <h1>Rel &lt;=&gt; SQL Playground</h1>
      <LingoEditor
        editorState={sqlEditorState}
        setEditorState={setSQLEditorState}
        langSpec={LANGUAGES.sql}
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
