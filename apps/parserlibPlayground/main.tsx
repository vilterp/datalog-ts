import React, { useState } from "react";
import ReactDOM from "react-dom";
import ReactJson from "react-json-view";
import useLocalStorage from "react-use-localstorage";
// import { GRAMMAR } from "../../languageWorkbench/languages/grammar/parser";
import { parse, TraceTree } from "../../languageWorkbench/parserlib/parser";
import { Grammar } from "../../languageWorkbench/parserlib/types";

function Main() {
  const [text, tree, setText] = useParser(GRAMMAR, "main");

  return (
    <>
      <h1>Parserlib Playground</h1>

      <textarea
        rows={20}
        cols={50}
        value={text}
        onChange={(evt) => {
          setText(evt.target.value);
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

function useParser(
  grammar: Grammar,
  rule: string
): [string, TraceTree, (text: string) => void] {
  const [text, setText] = useState("");
  const tree = parse(grammar, rule, text);
  return [text, tree, setText];
}

const GRAMMAR: Grammar = {
  main: { type: "Text", value: "foo" },
};

ReactDOM.render(<Main />, document.getElementById("main"));
