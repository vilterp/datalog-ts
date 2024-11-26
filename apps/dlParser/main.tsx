import React, { useMemo } from "react";
import * as ReactDOM from "react-dom";
import {
  grammarToDL,
  inputToDL,
} from "../../languageWorkbench/parserlib/datalog/genDatalog";
import { Explorer } from "../../uiCommon/explorer";
import { nullLoader } from "../../core/loaders";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import useLocalStorage from "react-use-localstorage";
// @ts-ignore
import parseDL from "../../languageWorkbench/parserlib/datalog/parse.dl";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { parseMain } from "../../languageWorkbench/languages/grammar/parser";
import { parserGrammarToInternal } from "../../languageWorkbench/parserlib/translateAST";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { initialEditorState } from "../../uiCommon/ide/types";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { ParseErrors } from "../../languageWorkbench/parserlib/types";

const INITIAL_GRAMMAR_TEXT = `main :- repSep("foo", "bar").`;

function Main() {
  const [source, setSource] = useLocalStorage("dl-parser-playground-source");
  const [grammarEditorState, setGrammarEditorState] = useJSONLocalStorage(
    "dl-parser-playground-grammar-editor-state",
    initialEditorState(INITIAL_GRAMMAR_TEXT)
  );

  const { interp: interp2, error } = useMemo(() => {
    const interp1 = constructInterp(grammarEditorState.source);
    return insertInput(interp1, source);
  }, [source, grammarEditorState.source]);

  return (
    <>
      <h1>Datalog Parser</h1>
      <table>
        <tbody>
          <tr>
            <td>
              <h3>Source</h3>
              <textarea
                autoFocus={true}
                rows={10}
                cols={80}
                onChange={(evt) => setSource(evt.target.value)}
                value={source}
                spellCheck={false}
              />
            </td>
            <td>
              <h3>Grammar Source</h3>
              <LingoEditor
                editorState={grammarEditorState}
                setEditorState={setGrammarEditorState}
                langSpec={LANGUAGES.grammar}
              />
            </td>
          </tr>
        </tbody>
      </table>
      {error ? <pre style={{ color: "red" }}>{error.toString()}</pre> : null}
      <Explorer interp={interp2} showViz />
    </>
  );
}

function constructInterp(grammarSource: string) {
  let interp = new IncrementalInterpreter(
    ".",
    nullLoader
  ) as AbstractInterpreter;
  interp = interp.evalStr(parseDL)[1];
  const [grammarTree, errors] = parseMain(grammarSource);
  if (errors.length > 0) {
    throw new ParseErrors(errors);
  }
  const grammarParsed = parserGrammarToInternal(grammarTree);
  const rules = grammarToDL(grammarParsed);
  interp = interp.evalRawStmts(
    rules.map((record) => ({ type: "Fact", record }))
  )[1];
  return interp;
}

function insertInput(interp: AbstractInterpreter, source: string) {
  let error: Error = null;
  try {
    interp = interp.insertAll(inputToDL(source));
  } catch (e) {
    error = e;
  }
  return { interp, error };
}

ReactDOM.createRoot(document.getElementById("main")).render(<Main />);
