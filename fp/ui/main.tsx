import React, { useState } from "react";
import ReactDOM from "react-dom";
import Editor from "react-simple-code-editor/src/index";
import { Expr, language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { Loader } from "../../repl";
import { ReplCore } from "../../replCore";
import useLocalStorage from "react-use-localstorage";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import { Collapsible } from "../../uiCommon/collapsible";
// @ts-ignore
import highlightCSS from "./highlight.css";
// @ts-ignore
import typecheckDL from "../typecheck.dl";
// @ts-ignore
import ideDL from "../ide.dl";
// @ts-ignore
import stdlibDL from "../stdlib.dl";
// @ts-ignore
import highlightDL from "../highlight.dl";
import { CodeEditor } from "../../uiCommon/codeEditor";
import { useIntLocalStorage } from "../../uiCommon/hooks";

const loader: Loader = (path: string) => {
  switch (path) {
    case "typecheck.dl":
      return typecheckDL;
    case "ide.dl":
      return ideDL;
    case "stdlib.dl":
      return stdlibDL;
    case "highlight.dl":
      return highlightDL;
  }
};

function Main() {
  const [source, setSource] = useLocalStorage(
    "source",
    "let x = 2 in intToString(x)"
  );

  const repl = new ReplCore(loader);
  repl.doLoad("typecheck.dl");
  repl.doLoad("ide.dl");
  repl.doLoad("stdlib.dl");
  repl.doLoad("highlight.dl");

  const [cursorPos, setCursorPos] = useIntLocalStorage("cursor-pos", 0);
  repl.evalStr(`cursor{idx: ${cursorPos}}.`);

  const [selectedSugg, setSelectedSugg] = useState(0);

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <CodeEditor
        parse={fpLanguage.expr}
        flatten={flatten}
        repl={repl}
        highlightCSS={highlightCSS}
        source={source}
        setSource={setSource}
        cursorPos={cursorPos}
        setCursorPos={setCursorPos}
        selectedSugg={selectedSugg}
        setSelectedSugg={setSelectedSugg}
      />

      <Collapsible
        heading="Facts &amp; Rules"
        content={<TabbedTables repl={repl} />}
      />

      {/* <Collapsible
        heading="AST"
        content={
          <ReactJson
            name={null}
            enableClipboard={false}
            displayObjectSize={false}
            displayDataTypes={false}
            src={parsed}
            shouldCollapse={({ name }) => name === "span"}
          />
        }
      /> */}
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
