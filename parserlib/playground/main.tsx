import React, { useState } from "react";
import ReactDOM from "react-dom";
import { parse } from "../parser";
import { Grammar } from "../grammar";
import ReactJson from "react-json-view";
import useLocalStorage from "react-use-localstorage";
import { jsonGrammar } from "../examples/json";
import { extractRuleTree } from "../ruleTree";
import { Collapsible } from "../../uiCommon/collapsible";

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
  console.log({ source, tree, ruleTree });

  return (
    <>
      <h1>Parserlib Playground</h1>

      <textarea
        value={source}
        onChange={(evt) => setSource(evt.target.value)}
        rows={10}
        cols={50}
      />

      <Collapsible
        heading="Trace Tree"
        content={
          <>
            <ReactJson
              name={null}
              enableClipboard={false}
              displayObjectSize={false}
              displayDataTypes={false}
              src={tree}
              shouldCollapse={({ name }) => name === "span"}
            />
          </>
        }
      />

      <Collapsible
        heading="Rule Tree"
        content={
          <>
            <ReactJson
              name={null}
              enableClipboard={false}
              displayObjectSize={false}
              displayDataTypes={false}
              src={ruleTree}
              shouldCollapse={({ name }) => name === "span"}
            />
          </>
        }
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
