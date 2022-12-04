import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Explorer } from "../../uiCommon/explorer";
import { mapObjToList } from "../../util/util";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { EditorState, initialEditorState } from "../../uiCommon/ide/types";
import { LANGUAGES, LanguageSpec } from "../../languageWorkbench/languages";
import useHashParam from "use-hash-param";
import { ErrorList } from "../../uiCommon/ide/errorList";
import { addCursor, getInterpForDoc } from "../../languageWorkbench/interp";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";

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

  const langSpec: LanguageSpec = useMemo(
    () => ({
      name: langName,
      datalog: dlEditorState.source,
      grammar: grammarEditorState.source,
      example: "",
    }),
    [langName, dlEditorState.source, grammarEditorState.source]
  );

  const { interp: interpWithoutCursor, errors } = useMemo(
    () => getInterpForDoc(INIT_INTERP, langSpec, langSource),
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
                lineNumbers="off"
                showKeyBindingsTable
              />
              <ErrorList errors={errors} />
            </td>
            <td>
              <h3>Grammar Source</h3>
              <LingoEditor
                editorState={grammarEditorState}
                setEditorState={setGrammarEditorState}
                langSpec={LANGUAGES.grammar}
                lineNumbers="off"
              />
            </td>
            <td>
              <h3>Datalog Source</h3>
              <LingoEditor
                editorState={dlEditorState}
                setEditorState={setDLEditorState}
                langSpec={LANGUAGES.datalog}
                lineNumbers="off"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <CollapsibleWithHeading
        heading="Explorer"
        content={
          <>
            {/* we run into errors querying highlight rules if the grammar isn't valid */}
            {errors.length === 0 ? (
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
