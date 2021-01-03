import * as React from "react";
import { ChangeEvent, useState } from "react";
import * as ReactDOM from "react-dom";
import * as diff from "diff";
import { formatOutput, Output } from "../../incremental/interpreter";
import { IncrementalInputManager, InputEvt } from "../incrementalInput";
import { Change } from "diff";
import { flatMap } from "../../util/util";
import { initializeInterp } from "../genDatalog";
import { ppRule } from "../../pretty";

const GRAMMAR_TEXT = `main :- (foo | barBaz | fooBarBaz).
foo :- "foo".
barBaz :- ["bar", "baz"].
fooBarBaz :- [foo, barBaz].`;

// TODO: put these somewhere in React-land
const { interp, rules } = initializeInterp(GRAMMAR_TEXT);
const inputManager = new IncrementalInputManager();

function Main() {
  const [source, setSource] = useState("");
  const [log, setLog] = useState<{ input: InputEvt; outputs: Output[] }[]>([]);

  // TODO: useCallback, useEffect
  const handleChange = (evt: ChangeEvent<HTMLTextAreaElement>) => {
    // TODO: there may be some way to get input events directly from DOM events,
    //   without having to diff the entire string
    const changes = diff.diffChars(source, evt.target.value);
    const events = changesToEvents(changes);

    const statements = flatMap(events, (event) =>
      inputManager.processEvent(event)
    );
    const outputs: Output[] = [];
    for (let stmt of statements) {
      const newOutput = interp.processStmt(stmt);
      outputs.push(newOutput);
    }
    console.log("handleChange", { changes, statements, outputs });

    setLog([...log, ...events.map((input) => ({ input, outputs }))]);
    setSource(evt.target.value);
  };

  return (
    <>
      <table>
        <tbody>
          <tr>
            <td>
              <textarea
                autoFocus={true}
                rows={10}
                cols={80}
                onChange={handleChange}
                value={source}
              />
            </td>
            <td>
              <pre>{GRAMMAR_TEXT}</pre>
            </td>
            <td>
              <pre>{rules.map(ppRule).join("\n")}</pre>
            </td>
          </tr>
        </tbody>
      </table>
      <h3>Log</h3>
      <ul>
        {log.map((inputOutput, idx) => (
          <li key={idx}>
            {JSON.stringify(inputOutput.input)}
            <br />
            <ul>
              {inputOutput.outputs
                .map(
                  (output) =>
                    formatOutput(interp.graph, output, {
                      propagationLogMode: "repl",
                      showBindings: false,
                    }).content
                )
                .filter((output) => output.length > 0)
                .map((output, idx2) => (
                  <li key={idx2}>
                    <pre>{output}</pre>
                  </li>
                ))}
            </ul>
          </li>
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
