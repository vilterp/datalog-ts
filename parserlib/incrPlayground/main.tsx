import * as React from "react";
import { ChangeEvent, useState } from "react";
import * as ReactDOM from "react-dom";
import * as diff from "diff";
import { Interpreter, Output } from "../../incremental/interpreter";
import { nullLoader } from "../../loaders";
import { parseGrammar } from "../meta";
import { grammarToDL } from "../genDatalog";
import { IncrementalInputManager, InputEvt } from "../incrementalInput";
import { Change } from "diff";

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

    // TODO: there may be some way to get input events directly from DOM events,
    //   without having to diff the entire string
    const changes = diff.diffChars(source, evt.target.value);
    const events = changesToEvents(changes);
    console.log("changes", changes);

    // const statements = inputManager.processEvent(inputEvent);
    // console.log(statements);

    setLog([...log, ...events.map((input) => ({ input, outputs: [] }))]);
    setSource(evt.target.value);
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

function changesToEvents(changes: Change[]): InputEvt[] {
  const out: InputEvt[] = [];
  let index = 0;
  for (let change of changes) {
    if (change.added) {
      for (let i = 0; i < change.value.length; i++) {
        out.push({ type: "Insert", index, char: change.value[i] });
        index++;
      }
    } else if (change.removed) {
      for (let i = 0; i < change.value.length; i++) {
        out.push({ type: "Delete", index });
        index++;
      }
    } else {
      index += change.value.length;
    }
  }
  return out;
}

ReactDOM.render(<Main />, document.getElementById("main"));
