import React from "react";
import ReactDOM from "react-dom";
import { parse, TraceTree } from "../parser";
import ReactJson from "react-json-view";
import useLocalStorage from "react-use-localstorage";
import { extractRuleTree, RuleTree } from "../ruleTree";
import { Collapsible } from "../../uiCommon/collapsible";
import {
  TreeView,
  TreeCollapseState,
  emptyCollapseState,
} from "../../uiCommon/treeView";
import { ruleTreeToTree, renderRuleNode } from "../pretty";
import { useJSONLocalStorage } from "../../uiCommon/hooks";
import { metaGrammar, extractGrammar } from "../meta";
import { validateGrammar } from "../validate";
import { grammarToDL } from "../genDatalog";
import * as dl from "../../types";
import { ppRule } from "../../pretty";

function Main() {
  return <Playground />;
}

function Playground(props: {}) {
  const [grammarSource, setGrammarSource] = useLocalStorage(
    "parserlib-playground-grammar-source",
    `main :- "foo".`
  );

  const grammarTraceTree = parse(metaGrammar, "grammar", grammarSource);
  const grammarRuleTree = extractRuleTree(grammarTraceTree);
  const grammar = extractGrammar(grammarSource, grammarRuleTree);
  const grammarErrors = validateGrammar(grammar);

  const [source, setSource] = useLocalStorage(
    "parserlib-playground-source",
    ""
  );
  let tree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let error: string = null;
  let dlRules: dl.Rule[] = [];
  try {
    tree = parse(grammar, "main", source);
    ruleTree = extractRuleTree(tree);
    dlRules = grammarToDL(grammar);
  } catch (e) {
    error = e.toString();
  }
  // console.log({ grammar, source, tree, ruleTree, error });

  const [ruleTreeCollapseState, setRuleTreeCollapseState] = useJSONLocalStorage<
    TreeCollapseState
  >("rule-tree-collapse-state", emptyCollapseState);

  return (
    <>
      <h1>Parserlib Playground</h1>

      <h3>Grammar Source</h3>
      <textarea
        value={grammarSource}
        onChange={(evt) => setGrammarSource(evt.target.value)}
        rows={10}
        cols={50}
      />

      <h3>Language Source</h3>
      <textarea
        value={source}
        onChange={(evt) => setSource(evt.target.value)}
        rows={10}
        cols={50}
      />

      {/* TODO: validate grammar */}

      {grammarErrors ? (
        <ul style={{ color: "red" }}>
          {grammarErrors.map((ge) => (
            <li key={ge}>{ge}</li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <pre style={{ color: "red" }}>{error}</pre>
      ) : (
        <>
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

          <Collapsible
            heading="Generated DL"
            content={
              <>
                <pre>{dlRules.map(ppRule).join("\n")}</pre>
              </>
            }
          />
        </>
      )}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
