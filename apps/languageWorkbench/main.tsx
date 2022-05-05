import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { mapObjToList } from "../../util/util";
import { OpenCodeEditor } from "../../uiCommon/ide/dlPowered/openCodeEditor";
import { EditorState, initialEditorState } from "../../uiCommon/ide/types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import useHashParam from "use-hash-param";
// @ts-ignore
import commonThemeCSS from "../../uiCommon/ide/dlPowered/commonTheme.css";
import { LOADER, mainDL } from "../../languageWorkbench/common";
import { ErrorList } from "../../uiCommon/ide/errorList";
import { WrappedCodeEditor } from "../../uiCommon/ide/dlPowered/wrappedCodeEditor";
import { addCursor, constructInterp } from "../../languageWorkbench/interp";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";

const initInterp = new SimpleInterpreter(".", LOADER);

function Main() {
  return <Playground />;
}

function Playground() {
  // state
  const [langName, setLangName] = useHashParam("", Object.keys(LANGUAGES)[0]);

  const curExample = LANGUAGES[langName];

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
    finalInterp: withoutCursor,
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
    () => addCursor(withoutCursor, cursorPos),
    [cursorPos, withoutCursor]
  );

  const setLang = (name) => {
    setLangName(name);
    const example = LANGUAGES[name];
    setGrammarEditorState({ ...grammarEditorState, source: example.grammar });
    setDLEditorState({ ...dlEditorState, source: example.datalog });
    setExampleSource(example.example);
  };

  return (
    <>
      <h1>Lingo Language Workbench</h1>

      <div>
        <h3>Example:</h3>
        <select
          onChange={(evt) => {
            setLang(evt.target.value);
          }}
          value={langName}
        >
          {mapObjToList(LANGUAGES, (name) => (
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
                autofocus
              />
              <ErrorList errors={langParseError ? [langParseError] : []} />
            </td>
            <td>
              <h3>Grammar Source</h3>
              <WrappedCodeEditor
                editorState={grammarEditorState}
                setEditorState={setGrammarEditorState}
                datalog={LANGUAGES.grammar.datalog}
                grammar={LANGUAGES.grammar.grammar}
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
                datalog={LANGUAGES.datalog.datalog}
                grammar={LANGUAGES.datalog.grammar}
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

      <p>
        <em>
          Source:{" "}
          <a href="https://github.com/vilterp/datalog-ts">
            github.com/vilterp/datalog-ts
          </a>
        </em>
      </p>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
