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
import {
  constructInterp,
  WrappedCodeEditor,
} from "../../uiCommon/ide/datalogPowered/wrappedCodeEditor";

const initInterp = new SimpleInterpreter(".", LOADER);

function Main() {
  return <Playground />;
}

function Playground() {
  // state
  const [exampleName, setExampleName] = useHashParam(
    "",
    Object.keys(EXAMPLES)[0]
  );

  const curExample = EXAMPLES[exampleName];

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

  const { finalInterp, allGrammarErrors, langParseError, dlErrors } = useMemo(
    () =>
      constructInterp({
        initInterp,
        cursorPos,
        dlSource: dlEditorState.source,
        grammarSource: grammarEditorState.source,
        langSource,
      }),
    [cursorPos, dlEditorState.source, grammarEditorState.source, langSource]
  );

  const setExample = (name) => {
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
              <OpenCodeEditor
                editorState={exampleEditorState}
                setEditorState={setExampleEditorState}
                interp={finalInterp}
                validGrammar={allGrammarErrors.length === 0}
                highlightCSS={commonThemeCSS}
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
                hideKeyBindingsTable
              />
              <ErrorList errors={dlErrors} />
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

ReactDOM.render(<Main />, document.getElementById("main"));
