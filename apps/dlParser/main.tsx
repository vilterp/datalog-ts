import React, { useMemo } from "react";
import * as ReactDOM from "react-dom";
import {
  grammarToDL,
  inputToDL,
} from "../../languageWorkbench/parserlib/datalog/genDatalog";
import { Explorer } from "../../uiCommon/explorer";
import { nullLoader } from "../../core/loaders";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { parseGrammar } from "../../languageWorkbench/parserlib/meta";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import useLocalStorage from "react-use-localstorage";
// @ts-ignore
import parseDL from "../../languageWorkbench/parserlib/datalog/parse.dl";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";

const INITIAL_GRAMMAR_TEXT = `main :- repSep("foo", "bar").`;

function Main() {
  const [source, setSource] = useLocalStorage("dl-parser-playground-source");
  const [grammarSource, setGrammarSource] = useLocalStorage(
    "dl-parser-playground-grammar-source",
    INITIAL_GRAMMAR_TEXT
  );

  const interp1 = useMemo(
    () => constructInterp(grammarSource),
    [grammarSource]
  );

  const { interp: interp2, error } = useMemo(
    () => insertInput(interp1, source),
    [source, interp1]
  );

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
              <textarea
                autoFocus={true}
                rows={10}
                cols={80}
                onChange={(evt) => setGrammarSource(evt.target.value)}
                value={grammarSource}
                spellCheck={false}
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
  const grammarParsed = parseGrammar(grammarSource);
  const rules = grammarToDL(grammarParsed);
  interp = interp.evalStmts(rules.map((rule) => ({ type: "Rule", rule })))[1];
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

ReactDOM.render(<Main />, document.getElementById("main"));
