import * as React from "react";
import { ChangeEvent, useState } from "react";
import * as ReactDOM from "react-dom";
import { Interpreter, Output } from "../../incremental/interpreter";
import { nullLoader } from "../../loaders";
import { parseGrammar } from "../meta";
import { grammarToDL } from "../genDatalog";
import { IncrementalInputManager, InputEvt } from "../incrementalInput";

const GRAMMAR_TEXT = `main :- (foo | barBaz).
foo :- "foo".
barBaz :- ["bar", "baz"].`;

function initializeInterp(): Interpreter {
  const grammarParsed = parseGrammar(GRAMMAR_TEXT);
  const gramamrRules = grammarToDL(grammarParsed);

  const interp = new Interpreter(nullLoader);
  interp.evalStr(".table source");
  interp.evalStr(".table next");
  // @ts-ignore
  window.interp = interp;

  for (let rule of gramamrRules) {
    interp.processStmt({ type: "Rule", rule });
  }
  return interp;
}

const interp = initializeInterp();
const inputManager = new IncrementalInputManager();
const log: Output[] = [];

function Main() {
  const [source, setSource] = useState("");
  const [log, setLog] = useState<{ input: InputEvt; outputs: Output[] }[]>([]);

  // TODO: useCallback, useEffect
  const handleChange = (evt: ChangeEvent<HTMLTextAreaElement>) => {
    console.log("handleChange", evt);
    setSource(evt.target.value);

    const inputEvent: InputEvt = {
      type: "Insert",
      index: 0,
      char: "f",
    };

    // TODO: get actual event
    const statements = inputManager.processEvent(inputEvent);
    console.log(statements);

    setLog([...log, { input: inputEvent, outputs: [] }]);
  };

  return (
    <>
      <textarea
        autoFocus={true}
        rows={10}
        cols={80}
        onChange={handleChange}
        value={source}
      />
      <h3>Log</h3>
      <ul>
        {log.map((inputOutput, idx) => (
          <li key={idx}>{JSON.stringify(inputOutput.input)}</li>
        ))}
      </ul>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
