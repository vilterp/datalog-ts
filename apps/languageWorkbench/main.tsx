import React, { useMemo, useState } from "react";
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
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import {
  TreeView,
  TreeCollapseState,
  emptyCollapseState,
} from "../../uiCommon/generic/treeView";
import { ruleTreeToTree, renderRuleNode } from "../../parserlib/pretty";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { metaGrammar, extractGrammar } from "../../parserlib/meta";
import { validateGrammar } from "../../parserlib/validate";
import { getAllStatements } from "../../parserlib/flatten";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { mapObjToList, uniq } from "../../util/util";
import { CodeEditor } from "../../uiCommon/ide/parserlibPowered/codeEditor";
import { ensureHighlightSegmentTable } from "./util";
import { EditorState, initialEditorState } from "../../uiCommon/ide/types";
import { EXAMPLES } from "./examples";
import useHashParam from "use-hash-param";
// @ts-ignore
import mainDL from "./dl/main.dl";
import { LOADER } from "./dl";

function Main() {
  return <Playground />;
}

const initInterp = new SimpleInterpreter(".", LOADER);

function Playground() {
  // state
  const [exampleName, setExampleName] = useHashParam(
    "",
    Object.keys(EXAMPLES)[0]
  );

  const curExample = EXAMPLES[exampleName];

  const [grammarSource, setGrammarSource] = useState(curExample.grammar);
  const [dlSource, setDLSource] = useState(curExample.datalog);
  const [themeSource, setThemeSource] = useState(curExample.themeCSS);
  const [exampleEditorState, setExampleEditorState] = useState<EditorState>(
    initialEditorState(curExample.example)
  );
  const [ruleTreeCollapseState, setRuleTreeCollapseState] =
    useJSONLocalStorage<TreeCollapseState>(
      "language-workbench-rule-tree-collapse-state",
      emptyCollapseState
    );
  const cursorPos = exampleEditorState.cursorPos;
  const langSource = exampleEditorState.source;
  const setExampleSource = (source: string) => {
    setExampleEditorState({ ...exampleEditorState, source });
  };

  const {
    finalInterp,
    allGrammarErrors,
    langParseError,
    dlErrors,
    ruleTree,
    traceTree,
  } = useMemo(
    () =>
      constructInterp({
        cursorPos,
        dlSource,
        grammarSource,
        langSource,
      }),
    [cursorPos, dlSource, grammarSource, langSource]
  );

  const setExample = (name) => {
    setExampleName(name);
    const example = EXAMPLES[name];
    setGrammarSource(example.grammar);
    setThemeSource(example.themeCSS);
    setDLSource(example.datalog);
    setExampleSource(example.example);
  };

  return (
    <>
      <h1>Language Workbench</h1>

      <div>
        <h3>Example:</h3>
        <select
          onChange={(evt) => {
            setExample(evt.target.value);
          }}
          value={exampleName}
        >
          {mapObjToList(EXAMPLES, (name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <table>
        <tbody>
          <tr>
            <td>
              <h3>Language Source</h3>
              <CodeEditor
                editorState={exampleEditorState}
                setEditorState={setExampleEditorState}
                interp={finalInterp}
                validGrammar={allGrammarErrors.length === 0}
                highlightCSS={themeSource}
                locatedErrors={[]} // TODO: parse errors
                suggestions={[]} // TODO: get suggestions
              />
              <ErrorList errors={langParseError ? [langParseError] : []} />
            </td>
            <td>
              <h3>Grammar Source</h3>
              <textarea
                value={grammarSource}
                onChange={(evt) => setGrammarSource(evt.target.value)}
                rows={10}
                cols={50}
                spellCheck={false}
              />
              <ErrorList errors={allGrammarErrors} />
            </td>
            <td>
              <h3>Datalog Source</h3>
              <textarea
                value={dlSource}
                onChange={(evt) => setDLSource(evt.target.value)}
                rows={10}
                cols={50}
                spellCheck={false}
              />
              <ErrorList errors={dlErrors} />
            </td>
            <td>
              <h3>Theme Source</h3>
              <textarea
                value={themeSource}
                onChange={(evt) => setThemeSource(evt.target.value)}
                rows={10}
                cols={50}
                spellCheck={false}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <>
        {/* we run into errors querying highlight rules if the grammar isn't valid */}
        {allGrammarErrors.length === 0 ? (
          <Explorer interp={finalInterp} showViz />
        ) : (
          <em>Grammar isn't valid</em>
        )}
      </>
    </>
  );
}

function constructInterp({
  dlSource,
  grammarSource,
  langSource,
  cursorPos,
}: {
  dlSource: string;
  grammarSource: string;
  langSource: string;
  cursorPos: number;
}) {
  const grammarTraceTree = parse(metaGrammar, "grammar", grammarSource);
  const grammarRuleTree = extractRuleTree(grammarTraceTree);
  const grammar = extractGrammar(grammarSource, grammarRuleTree);
  const grammarParseErrors = getErrors(grammarSource, grammarTraceTree).map(
    formatParseError
  );
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
  const noMainError = grammar.main ? [] : ["grammar has no 'main' rule"];
  const allGrammarErrors = [
    ...grammarErrors,
    ...grammarParseErrors,
    ...noMainError,
  ];

  // initialize stuff that we'll fill in later, if parse succeeds
  let traceTree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let langParseError: string = null;
  let finalInterp: AbstractInterpreter = interpWithRules;

  if (allGrammarErrors.length === 0) {
    try {
      traceTree = parse(grammar, "main", langSource);
      ruleTree = extractRuleTree(traceTree);
      const flattenStmts = getAllStatements(grammar, ruleTree, langSource);
      finalInterp = finalInterp.evalStmts(flattenStmts)[1];
      finalInterp = ensureHighlightSegmentTable(finalInterp);
      finalInterp = finalInterp.evalStr(mainDL)[1];
    } catch (e) {
      langParseError = e.toString();
      console.error(e);
    }
  }
  finalInterp = finalInterp.evalStr(`ide.Cursor{idx: ${cursorPos}}.`)[1];

  return {
    finalInterp,
    allGrammarErrors,
    langParseError,
    dlErrors,
    ruleTree,
    traceTree,
  };
}

function ErrorList(props: { errors: string[] }) {
  return props.errors.length > 0 ? (
    <ul>
      {uniq(props.errors).map((err) => (
        <li
          key={err}
          style={{ color: "red", fontFamily: "monospace", whiteSpace: "pre" }}
        >
          {err}
        </li>
      ))}
    </ul>
  ) : null;
}

ReactDOM.render(<Main />, document.getElementById("main"));
