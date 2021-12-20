import React from "react";
import ReactDOM from "react-dom";
import {
  formatParseError,
  getErrors,
  parse,
  TraceTree,
} from "../../parserlib/parser";
import ReactJson from "react-json-view";
import useLocalStorage from "react-use-localstorage";
import { extractRuleTree, RuleTree } from "../../parserlib/ruleTree";
import { Collapsible } from "../../uiCommon/generic/collapsible";
import {
  TreeView,
  TreeCollapseState,
  emptyCollapseState,
} from "../../uiCommon/generic/treeView";
import { ruleTreeToTree, renderRuleNode } from "../../parserlib/pretty";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { metaGrammar, extractGrammar } from "../../parserlib/meta";
import { validateGrammar } from "../../parserlib/validate";
import { Rec } from "../../core/types";
import { BareTerm } from "../../uiCommon/dl/replViews";
import { flatten } from "../../parserlib/flatten";

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
  const grammarParseErrors = getErrors(grammarTraceTree).map(formatParseError);
  const grammarErrors = validateGrammar(grammar);

  console.log({ grammar });

  const allErrors = [...grammarErrors, ...grammarParseErrors];

  const [source, setSource] = useLocalStorage(
    "parserlib-playground-source",
    ""
  );
  let tree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let error: string = null;
  let flattened: Rec[] = [];

  if (allErrors.length === 0) {
    try {
      tree = parse(grammar, "main", source);
      ruleTree = extractRuleTree(tree);
      flattened = flatten(ruleTree, source);
    } catch (e) {
      error = e.toString();
      console.error(e);
    }
  }
  // console.log({ grammar, source, tree, ruleTree, error });

  const [ruleTreeCollapseState, setRuleTreeCollapseState] =
    useJSONLocalStorage<TreeCollapseState>(
      "rule-tree-collapse-state",
      emptyCollapseState
    );

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

      {allErrors.length > 0 ? (
        <ul style={{ color: "red" }}>
          {allErrors.map((ge) => (
            <li key={ge}>{ge}</li>
          ))}
        </ul>
      ) : error ? (
        <pre style={{ color: "red" }}>{error}</pre>
      ) : (
        <>
          <Collapsible
            heading="Rule Tree"
            content={
              <>
                <TreeView
                  tree={ruleTreeToTree(ruleTree, source)}
                  render={(n) => renderRuleNode(n.item, source)}
                  collapseState={ruleTreeCollapseState}
                  setCollapseState={setRuleTreeCollapseState}
                />
              </>
            }
          />
          <Collapsible
            heading="Flattened"
            content={
              <>
                <ul>
                  {flattened.map((record, idx) => (
                    <li key={idx}>
                      <BareTerm term={record} />
                    </li>
                  ))}
                </ul>
              </>
            }
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
        </>
      )}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
