import * as React from "react";
import * as ReactDOM from "react-dom";
import { grammarToDL, inputToDL } from "../../parserlib/datalog/genDatalog";
import { Explorer } from "../../uiCommon/explorer";
import { nullLoader } from "../../core/loaders";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { parseGrammar } from "../../parserlib/meta";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import useLocalStorage from "react-use-localstorage";

const GRAMMAR_TEXT = `main :- repSep("foo", "bar").`;

export function initializeInterp(
  interp: AbstractInterpreter,
  grammarText: string
): AbstractInterpreter {
  const grammarParsed = parseGrammar(grammarText);
  const rules = grammarToDL(grammarParsed);

  const [_1, interp2] = interp.evalStr(".table source");
  const [_2, interp3] = interp2.evalStr(".table next");

  const [_3, interp4] = interp3.evalStmts(
    rules.map((rule) => ({ type: "Rule", rule }))
  );
  return interp4;
}

function Main() {
  const [source, setSource] = useLocalStorage("dl-parser-playground-source");
  const [grammarSource, setGrammarSource] = useLocalStorage(
    "dl-parser-playground-grammar-source",
    GRAMMAR_TEXT
  );

  let interp = new SimpleInterpreter(".", nullLoader) as AbstractInterpreter;
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
      <Explorer interp={interp} />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
