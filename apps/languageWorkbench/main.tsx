import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { mapObjToList } from "../../util/util";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { EditorState, initialEditorState } from "../../uiCommon/ide/types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import useHashParam from "use-hash-param";
import { LOADER } from "../../languageWorkbench/commonDL";
import { ErrorList } from "../../uiCommon/ide/errorList";
import { addCursor, constructInterp } from "../../languageWorkbench/interp";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";

const INIT_INTERP = new SimpleInterpreter(".", LOADER);

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

  const setLang = (name) => {
    setLangName(name);
    const example = LANGUAGES[name];
    setGrammarEditorState({ ...grammarEditorState, source: example.grammar });
    setDLEditorState({ ...dlEditorState, source: example.datalog });
    setExampleSource(example.example);
  };

  const langSpec = LANGUAGES[langName];

  const {
    interp: interpWithoutCursor,
    allGrammarErrors,
    langParseError,
    dlErrors,
  } = useMemo(
    () => constructInterp(INIT_INTERP, langSpec, langSource),
    [langSpec, langSource]
  );
  const interp = addCursor(interpWithoutCursor, cursorPos);

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
              <LingoEditor
                editorState={exampleEditorState}
                setEditorState={setExampleEditorState}
                langSpec={langSpec}
              />
              <ErrorList errors={langParseError ? [langParseError] : []} />
            </td>
            <td>
              <h3>Grammar Source</h3>
              <LingoEditor
                editorState={grammarEditorState}
                setEditorState={setGrammarEditorState}
                langSpec={LANGUAGES.grammar}
              />
              <ErrorList errors={allGrammarErrors} />
            </td>
            <td>
              <h3>Datalog Source</h3>
              <LingoEditor
                editorState={dlEditorState}
                setEditorState={setDLEditorState}
                langSpec={LANGUAGES.datalog}
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
              <Explorer interp={interp} showViz />
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
