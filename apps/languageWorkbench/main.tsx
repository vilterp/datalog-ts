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
import { uniq } from "../../util/util";

function Main() {
  return <Playground />;
}

const initInterp = new SimpleInterpreter(".", nullLoader);

function ErrorList(props: { errors: string[] }) {
  return props.errors.length > 0 ? (
    <ul>
      {uniq(props.errors).map((err) => (
        <li key={err} style={{ color: "red", fontFamily: "monospace" }}>
          {err}
        </li>
      ))}
    </ul>
  ) : null;
}

function Playground() {
  // state
  const [grammarSource, setGrammarSource] = useLocalStorage(
    "parserlib-playground-grammar-source",
    `main :- "foo".`
  );
  const [langSource, setLangSource] = useLocalStorage(
    "parserlib-playground-source",
    ""
  );
  const [dlSource, setDLSource] = useLocalStorage(
    "parserlib-playground-dl-source",
    ""
  );
  const [ruleTreeCollapseState, setRuleTreeCollapseState] =
    useJSONLocalStorage<TreeCollapseState>(
      "rule-tree-collapse-state",
      emptyCollapseState
    );

  const grammarTraceTree = parse(metaGrammar, "grammar", grammarSource);
  const grammarRuleTree = extractRuleTree(grammarTraceTree);
  const grammar = extractGrammar(grammarSource, grammarRuleTree);
  const grammarParseErrors = getErrors(grammarTraceTree).map(formatParseError);
  const grammarErrors = validateGrammar(grammar);
  const [interpWithRules, dlErrors] = (() => {
    try {
      const result =
        dlSource.length > 0 ? initInterp.evalStr(dlSource)[1] : initInterp;
      return [result, []];
    } catch (e) {
      return [initInterp, [e.toString()]];
    }
  })();
  const allGrammarErrors = [...grammarErrors, ...grammarParseErrors];

  // initialize stuff that we'll fill in later, if parse succeeds
  let traceTree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let langParseError: string = null;
  let flattened: Rec[] = [];
  let finalInterp: AbstractInterpreter = interpWithRules;

  if (allGrammarErrors.length === 0) {
    try {
      traceTree = parse(grammar, "main", langSource);
      ruleTree = extractRuleTree(traceTree);
      flattened = flatten(ruleTree, langSource);
      flattened.forEach((rec) => {
        finalInterp = finalInterp.insert(rec) as SimpleInterpreter;
      });
    } catch (e) {
      langParseError = e.toString();
      console.error(e);
    }
  }

  return (
    <>
      <h1>Language Workbench</h1>

      <table>
        <tbody>
          <tr>
            <td>
              <h3>Grammar Source</h3>
              <textarea
                value={grammarSource}
                onChange={(evt) => setGrammarSource(evt.target.value)}
                rows={10}
                cols={50}
              />
              <ErrorList errors={allGrammarErrors} />
            </td>
            <td>
              <h3>Language Source</h3>
              <textarea
                value={langSource}
                onChange={(evt) => setLangSource(evt.target.value)}
                rows={10}
                cols={50}
              />
              <ErrorList errors={langParseError ? [langParseError] : []} />
            </td>
            <td>
              <h3>Datalog Source</h3>
              <textarea
                value={dlSource}
                onChange={(evt) => setDLSource(evt.target.value)}
                rows={10}
                cols={50}
              />
              <ErrorList errors={dlErrors} />
            </td>
          </tr>
        </tbody>
      </table>

      <>
        {langParseError ? (
          <pre style={{ color: "red" }}>{langParseError}</pre>
        ) : null}
        <Explorer interp={finalInterp} />

        {/* TODO: memoize some of these. they take non-trival time to render */}

        <Collapsible
          heading="Rule Tree"
          content={
            <>
              {ruleTree ? (
                <TreeView
                  tree={ruleTreeToTree(ruleTree, langSource)}
                  render={(n) => renderRuleNode(n.item, langSource)}
                  collapseState={ruleTreeCollapseState}
                  setCollapseState={setRuleTreeCollapseState}
                />
              ) : (
                <em>Grammar isn't valid</em>
              )}
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
              {traceTree ? (
                <ReactJson
                  name={null}
                  enableClipboard={false}
                  displayObjectSize={false}
                  displayDataTypes={false}
                  src={traceTree}
                  shouldCollapse={({ name }) => name === "span"}
                />
              ) : (
                <em>Grammar isn't valid</em>
              )}
            </>
          }
        />
      </>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
