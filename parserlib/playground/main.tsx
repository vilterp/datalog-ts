import React, { useState } from "react";
import ReactDOM from "react-dom";
import { parse } from "../parser";
import { Grammar } from "../grammar";
import ReactJson from "react-json-view";
import useLocalStorage from "react-use-localstorage";
import { jsonGrammar } from "../examples/json";
import { extractRuleTree } from "../ruleTree";

function Main() {
  return <Playground grammar={jsonGrammar} startRule="value" />;
}

function Playground(props: { grammar: Grammar; startRule: string }) {
  const [source, setSource] = useLocalStorage(
    "parserlib-playground-source",
    ""
  );
  const tree = parse(props.grammar, props.startRule, source);
  const ruleTree = extractRuleTree(tree);
  console.log(source, tree);

  return (
    <>
      <h1>Parserlib Playground</h1>

      <textarea
        value={source}
        onChange={(evt) => setSource(evt.target.value)}
        rows={10}
        cols={50}
      />

      <ReactJson
        name={null}
        enableClipboard={false}
        displayObjectSize={false}
        displayDataTypes={false}
        src={ruleTree}
        shouldCollapse={({ name }) => name === "span"}
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
