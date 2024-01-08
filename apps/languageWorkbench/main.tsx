import React, { useReducer } from "react";
import ReactDOM from "react-dom/client";
import { Explorer } from "../../uiCommon/explorer";
import { mapObj, mapObjToList } from "../../util/util";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { EditorState } from "../../uiCommon/ide/types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import useHashParam from "use-hash-param";
import { ErrorList } from "../../uiCommon/ide/errorList";
import { addCursor } from "../../languageWorkbench/interpCache";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { LanguageSpec, dl } from "../../languageWorkbench/common/types";
import { CACHE } from "../../languageWorkbench/vscode/common";

function Main() {
  return <Workbench />;
}

function Workbench() {
  // state
  const [curLangID, setLangID] = useHashParam("", Object.keys(LANGUAGES)[0]);

  const [state, dispatch] = useReducer(reducer, emptyState);
  const curLangState = state[curLangID];
  const versionedLangID = `${curLangID}-${curLangState.version}`;

  const curLangSpec: LanguageSpec = {
    name: versionedLangID,
    logic: dl(curLangState.datalog.source),
    example: curLangState.example.source,
    grammar: curLangState.grammar.source,
  };

  const uri = `test.${curLangID}`;
  const interpWithoutCursor = CACHE.getInterpForDoc(
    versionedLangID,
    {
      [versionedLangID]: curLangSpec,
    },
    uri,
    curLangState.example.source
  ).interp;
  const errors = [];
  const interp = addCursor(interpWithoutCursor, curLangState.example.cursorPos);

  return (
    <>
      <h1>Lingo Language Workbench</h1>

      <div>
        <h3>Example:</h3>
        <select
          onChange={(evt) => {
            setLangID(evt.target.value);
          }}
          value={curLangID}
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
                editorState={curLangState.example}
                setEditorState={(newEditorState) =>
                  dispatch({
                    type: "UpdateLang",
                    langID: curLangID,
                    action: { type: "UpdateExample", newEditorState },
                  })
                }
                langSpec={curLangSpec}
                lineNumbers="off"
                showKeyBindingsTable
              />
              <ErrorList errors={errors} />
            </td>
            <td>
              <h3>Grammar Source</h3>
              <LingoEditor
                editorState={curLangState.grammar}
                setEditorState={(newEditorState) =>
                  dispatch({
                    type: "UpdateLang",
                    langID: curLangID,
                    action: { type: "UpdateGrammar", newEditorState },
                  })
                }
                langSpec={LANGUAGES.grammar}
                lineNumbers="off"
              />
            </td>
            <td>
              <h3>Datalog Source</h3>
              <LingoEditor
                editorState={curLangState.datalog}
                setEditorState={(newEditorState) =>
                  dispatch({
                    type: "UpdateLang",
                    langID: curLangID,
                    action: { type: "UpdateDatalog", newEditorState },
                  })
                }
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

type State = {
  [langID: string]: LangState;
};

type LangState = {
  version: number;
  example: EditorState;
  grammar: EditorState;
  datalog: EditorState;
};

const emptyState: State = mapObj(LANGUAGES, (langID, spec) => ({
  version: 1,
  example: { cursorPos: 1, source: spec.example },
  grammar: { cursorPos: 1, source: spec.grammar },
  datalog: { cursorPos: 1, source: spec.logic.source }, // TODO: differentiate DL2
}));

type Action = { type: "UpdateLang"; langID: string; action: LangAction };

type LangAction =
  | { type: "UpdateGrammar"; newEditorState: EditorState }
  | { type: "UpdateDatalog"; newEditorState: EditorState }
  | { type: "UpdateExample"; newEditorState: EditorState };

// TODO: dry up
function reducer(state: State, action: Action): State {
  const langState = state[action.langID];
  return { ...state, [action.langID]: updateLang(langState, action.action) };
}

function updateLang(langState: LangState, action: LangAction): LangState {
  switch (action.type) {
    case "UpdateGrammar": {
      return {
        ...langState,
        version: langState.version + 1,
        grammar: action.newEditorState,
      };
    }
    case "UpdateDatalog": {
      return {
        ...langState,
        version: langState.version + 1,
        datalog: action.newEditorState,
      };
    }
    case "UpdateExample": {
      return {
        ...langState,
        version: langState.version,
        example: action.newEditorState,
      };
    }
  }
}

ReactDOM.createRoot(document.getElementById("main")).render(<Main />);
