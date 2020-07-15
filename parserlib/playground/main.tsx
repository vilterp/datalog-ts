import React from "react";
import ReactDOM from "react-dom";
import { parse } from "../parser";
import { Grammar, Span } from "../grammar";
import ReactJson from "react-json-view";
import useLocalStorage from "react-use-localstorage";
import { jsonGrammar } from "../examples/json";
import { extractRuleTree } from "../ruleTree";
import { Collapsible } from "../../uiCommon/collapsible";
import {
  TreeView,
  TreeCollapseState,
  emptyCollapseState,
} from "../../uiCommon/treeView";
import { ruleTreeToTree, renderRuleNode } from "../pretty";
import { useJSONLocalStorage } from "../../uiCommon/hooks";
import { metaGrammar } from "../meta";

function Main() {
  return <Playground grammar={metaGrammar} startRule="grammar" />;
}

function Playground(props: { grammar: Grammar; startRule: string }) {
  const [source, setSource] = useLocalStorage(
    "parserlib-playground-source",
    ""
  );
  const tree = parse(props.grammar, props.startRule, source);
  const ruleTree = extractRuleTree(tree);
  console.log({ source, tree, ruleTree });

  const [ruleTreeCollapseState, setRuleTreeCollapseState] = useJSONLocalStorage<
    TreeCollapseState
  >("rule-tree-collapse-state", emptyCollapseState);

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
            <TreeView
              tree={ruleTreeToTree(ruleTree)}
              render={(n) => renderRuleNode(n.item)}
              collapseState={ruleTreeCollapseState}
              setCollapseState={setRuleTreeCollapseState}
            />
          </>
        }
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
