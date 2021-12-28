import * as React from "react";
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

export function initializeInterp(
  inputInterp: AbstractInterpreter,
  grammarText: string
): AbstractInterpreter {
  let interp = inputInterp;
  const grammarParsed = parseGrammar(grammarText);
  const records = grammarToDL(grammarParsed);

  interp = interp.evalStr(parseDL)[1];
  interp = interp.insertAll(records);
  return interp;
}

function Main() {
  const [source, setSource] = useLocalStorage("dl-parser-playground-source");
  const [grammarSource, setGrammarSource] = useLocalStorage(
    "dl-parser-playground-grammar-source",
    INITIAL_GRAMMAR_TEXT
  );

  let interp = new IncrementalInterpreter(
    ".",
    nullLoader
  ) as AbstractInterpreter;
  interp = initializeInterp(interp, grammarSource);
  interp = interp.insertAll(inputToDL(source));

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
      <Explorer interp={interp} showViz />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
