import * as React from "react";
import * as ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { nullLoader } from "../../core/loaders";
import { ppb } from "../../core/pretty";
import { int, rec, Statement, str } from "../../core/types";
import { Explorer } from "../../uiCommon/explorer";
import { EditableGraph } from "./editableGraph";

let initialExampleInterp = new IncrementalInterpreter(".", nullLoader);
// TODO: load these from
initialExampleInterp = initialExampleInterp.evalStr(
  ".table node"
)[1] as IncrementalInterpreter;
initialExampleInterp = initialExampleInterp.evalStr(
  ".table edge"
)[1] as IncrementalInterpreter;
// TODO: install transitive closure

// TODO: extract graph from example interp; insert into history interp
let initialHistoryInterp = new IncrementalInterpreter(".", nullLoader);
initialHistoryInterp = initialHistoryInterp.evalStr(
  ".table step"
)[1] as IncrementalInterpreter;

function Main() {
  const [exampleInterp, setExampleInterp] =
    React.useState(initialExampleInterp);
  const [historyInterp, dispatchHistoryInterp] = React.useReducer(
    (st: IncrementalInterpreter, action: Statement): IncrementalInterpreter =>
      st.evalStmt(action)[1] as IncrementalInterpreter,
    initialHistoryInterp
  );

  return (
    <div>
      <h2>Incremental Datalog</h2>
      <p>We want to </p>
      <ul>
        <li>Define rules</li>
        <li>Insert (and retract) facts</li>
        <li>
          Have the changes propagate through the rules to update output facts
        </li>
      </ul>
      <p>Take this graph problem as an example:</p>
      <Explorer interp={exampleInterp} />
      <EditableGraph
        interp={exampleInterp}
        runStmts={(stmts) => {
          // TODO: introduce user step id
          stmts.forEach((stmt) => {
            const res = exampleInterp.processStmt(stmt);
            setExampleInterp(res.newInterp as IncrementalInterpreter);
            if (res.output.type === "EmissionLog") {
              res.output.log.forEach((item) => {
                item.output.forEach((logItem) => {
                  const data = logItem.data;
                  dispatchHistoryInterp({
                    type: "Fact",
                    record: rec("step", {
                      fromID: str(item.fromID),
                      multiplicity: int(logItem.multiplicity),
                      data:
                        data.type === "Record"
                          ? data.rec
                          : str(ppb(data.bindings.bindings)),
                    }),
                  });
                });
              });
            }
          });
        }}
      />
      <p>
        You can add and remove nodes and edges, and see the transitive closure
        edges update.
      </p>
      <p>A log of what you've done can be seen in this explorer:</p>
      <Explorer interp={historyInterp} />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
