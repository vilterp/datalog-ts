import React, { useState } from "react";
import ReactDOM from "react-dom";
import ReactJson from "react-json-view";
import { GRAMMAR } from "../../languageWorkbench/languages/grammar/parser";
import { parse, TraceTree } from "../../languageWorkbench/parserlib/parser";

function Main() {
  const [text, setText] = useState("");
  const [tree, setTree] = useState<TraceTree>({
    type: "SucceedTrace",
    width: 0,
    error: null,
  });

  return (
    <>
      <h1>Parserlib Playground</h1>

      <textarea
        value={text}
        onChange={(evt) => {
          setText(evt.target.value);
          setTree(parse(GRAMMAR, "main", text));
        }}
      />

      <ReactJson
        src={tree}
        displayDataTypes={false}
        displayObjectSize={false}
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
