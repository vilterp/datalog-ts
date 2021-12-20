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
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { nullLoader } from "../../core/loaders";
import { Explorer } from "../../uiCommon/explorer";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

function Main() {
  return <Playground />;
}

const initInterp = new SimpleInterpreter(".", nullLoader);

function Playground() {
  const [grammarSource, setGrammarSource] = useLocalStorage(
    "parserlib-playground-grammar-source",
    `main :- "foo".`
  );

  const grammarTraceTree = parse(metaGrammar, "grammar", grammarSource);
  const grammarRuleTree = extractRuleTree(grammarTraceTree);
  const grammar = extractGrammar(grammarSource, grammarRuleTree);
  const grammarParseErrors = getErrors(grammarTraceTree).map(formatParseError);
  const grammarErrors = validateGrammar(grammar);
  const allErrors = [...grammarErrors, ...grammarParseErrors];

  const [langSource, setLangSource] = useLocalStorage(
    "parserlib-playground-source",
    ""
  );
  const [dlSource, setDLSource] = useLocalStorage(
    "parserlib-playground-dl-source",
    ""
  );

  // initialize stuff that we'll fill in later, if parse succeeds
  let tree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let error: string = null;
  let flattened: Rec[] = [];
  let finalInterp: AbstractInterpreter = null;

  if (allErrors.length === 0) {
    try {
      tree = parse(grammar, "main", langSource);
      ruleTree = extractRuleTree(tree);
      flattened = flatten(ruleTree, langSource);
      let curInterp = initInterp;
      flattened.forEach((rec) => {
        curInterp = curInterp.insert(rec) as SimpleInterpreter;
      });
      finalInterp =
        dlSource.length > 0 ? curInterp.evalStr(dlSource)[1] : curInterp;
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

      <table>
        <tr>
          <td>
            <h3>Grammar Source</h3>
            <textarea
              value={grammarSource}
              onChange={(evt) => setGrammarSource(evt.target.value)}
              rows={10}
              cols={50}
            />
          </td>
          <td>
            <h3>Language Source</h3>
            <textarea
              value={langSource}
              onChange={(evt) => setLangSource(evt.target.value)}
              rows={10}
              cols={50}
            />
          </td>
          <td>
            <h3>Datalog Source</h3>
            <textarea
              value={dlSource}
              onChange={(evt) => setDLSource(evt.target.value)}
              rows={10}
              cols={50}
            />
          </td>
        </tr>
      </table>

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
          <Explorer interp={finalInterp} />
          <Collapsible
            heading="Rule Tree"
            content={
              <>
                <TreeView
                  tree={ruleTreeToTree(ruleTree, langSource)}
                  render={(n) => renderRuleNode(n.item, langSource)}
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
