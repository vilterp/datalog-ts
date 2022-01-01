import React, { useMemo } from "react";
import * as ReactDOM from "react-dom";
import { grammarToDL, inputToDL } from "../../parserlib/datalog/genDatalog";
import { Explorer } from "../../uiCommon/explorer";
import { nullLoader } from "../../core/loaders";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { parseGrammar } from "../../parserlib/meta";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import useLocalStorage from "react-use-localstorage";
// @ts-ignore
import parseDL from "../../parserlib/datalog/parse.dl";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";

const INITIAL_GRAMMAR_TEXT = `main :- repSep("foo", "bar").`;

function Main() {
  const [source, setSource] = useLocalStorage("dl-parser-playground-source");
  const [grammarSource, setGrammarSource] = useLocalStorage(
    "dl-parser-playground-grammar-source",
    INITIAL_GRAMMAR_TEXT
  );

  const { interp, error } = constructInterp({ grammarSource, source });

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
              />
            </td>
          </tr>
        </tbody>
      </table>
      {error ? <pre style={{ color: "red" }}>{error.toString()}</pre> : null}
      <Explorer interp={interp} showViz />
    </>
  );
}

function constructInterp({
  grammarSource,
  source,
}: {
  grammarSource: string;
  source: string;
}) {
  let interp = new IncrementalInterpreter(
    ".",
    nullLoader
  ) as AbstractInterpreter;
  interp = interp.evalStr(parseDL)[1];
  const grammarParsed = parseGrammar(grammarSource);
  const records = grammarToDL(grammarParsed);
  interp = interp.insertAll(records);
  let error: Error = null;
  try {
    interp = interp.insertAll(inputToDL(source));
  } catch (e) {
    error = e;
  }
  return { interp, error };
}

ReactDOM.render(<Main />, document.getElementById("main"));
