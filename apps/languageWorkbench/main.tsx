import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { mapObjToList } from "../../util/util";
import { OpenCodeEditor } from "../../uiCommon/ide/datalogPowered/openCodeEditor";
import { EditorState, initialEditorState } from "../../uiCommon/ide/types";
import { EXAMPLES } from "./examples";
import useHashParam from "use-hash-param";
// @ts-ignore
import commonThemeCSS from "./commonTheme.css";
import { LOADER } from "../../uiCommon/ide/datalogPowered/dl";
import { ErrorList } from "../../uiCommon/ide/errorList";
// @ts-ignore
import mainDL from "../../uiCommon/ide/datalogPowered/dl/main.dl";
import { WrappedCodeEditor } from "../../uiCommon/ide/datalogPowered/wrappedCodeEditor";
import {
  constructInterp,
  insertCursorPos,
} from "../../uiCommon/ide/datalogPowered/interp";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";

const initInterp = new SimpleInterpreter(".", LOADER);

function Main() {
  return <Playground />;
}

function Playground() {
  // state
  const [langName, setExampleName] = useHashParam("", Object.keys(EXAMPLES)[0]);

  const curExample = EXAMPLES[langName];

  const [grammarEditorState, setGrammarEditorState] = useState(
    initialEditorState(curExample.grammar)
  );
  const [dlEditorState, setDLEditorState] = useState(
    initialEditorState(curExample.datalog)
  );

  const [exampleEditorState, setExampleEditorState] = useState<EditorState>(
    initialEditorState(curExample.example)
  );
  const cursorPos = exampleEditorState.cursorPos;
  const langSource = exampleEditorState.source;
  const setExampleSource = (source: string) => {
    setExampleEditorState({ ...exampleEditorState, source });
  };

  const {
    finalInterp: almostFinalInterp,
    allGrammarErrors,
    langParseError,
    dlErrors,
  } = useMemo(
    () =>
      constructInterp({
        builtinSource: mainDL,
        initInterp,
        dlSource: dlEditorState.source,
        grammarSource: grammarEditorState.source,
        langSource,
      }),
    [dlEditorState.source, grammarEditorState.source, langSource]
  );
  const finalInterp = useMemo(
    () => insertCursorPos(almostFinalInterp, cursorPos),
    [cursorPos]
  );

  const setLangName = (name) => {
    setExampleName(name);
    const example = EXAMPLES[name];
    setGrammarEditorState({ ...grammarEditorState, source: example.grammar });
    setDLEditorState({ ...dlEditorState, source: example.datalog });
    setExampleSource(example.example);
  };

  return (
    <>
      <h1>Language Workbench</h1>

      <div>
        <h3>Example:</h3>
        <select
          onChange={(evt) => {
            setLangName(evt.target.value);
          }}
          value={langName}
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
              <h3>Example Source</h3>
              <OpenCodeEditor
                editorState={exampleEditorState}
                setEditorState={setExampleEditorState}
                interp={finalInterp}
                validGrammar={allGrammarErrors.length === 0}
                highlightCSS={commonThemeCSS}
                lang={langName}
                locatedErrors={[]} // TODO: parse errors
              />
              <ErrorList errors={langParseError ? [langParseError] : []} />
            </td>
            <td>
              <h3>Grammar Source</h3>
              <WrappedCodeEditor
                editorState={grammarEditorState}
                setEditorState={setGrammarEditorState}
                datalog={EXAMPLES.grammar.datalog}
                grammar={EXAMPLES.grammar.grammar}
                highlightCSS={commonThemeCSS}
                lang="grammar"
                hideKeyBindingsTable
              />
              <ErrorList errors={allGrammarErrors} />
            </td>
            <td>
              <h3>Datalog Source</h3>
              <WrappedCodeEditor
                editorState={dlEditorState}
                setEditorState={setDLEditorState}
                datalog={EXAMPLES.datalog.datalog}
                grammar={EXAMPLES.datalog.grammar}
                highlightCSS={commonThemeCSS}
                lang="dl"
                hideKeyBindingsTable
              />
              <ErrorList errors={dlErrors} />
            </td>
          </tr>
        </tbody>
      </table>

      <CollapsibleWithHeading
        heading="Explorer"
        content={
          <>
            {/* we run into errors querying highlight rules if the grammar isn't valid */}
            {allGrammarErrors.length === 0 ? (
              <Explorer interp={finalInterp} showViz />
            ) : (
              <em>Grammar isn't valid</em>
            )}
          </>
        }
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
