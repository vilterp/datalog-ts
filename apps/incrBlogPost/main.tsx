import * as React from "react";
import * as ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { nullLoader } from "../../core/loaders";
import { ppb } from "../../core/pretty";
import { int, rec, str } from "../../core/types";
import { Explorer } from "../../uiCommon/explorer";
import { EditableGraph } from "./editableGraph";

const exampleInterp = new IncrementalInterpreter(".", nullLoader);
// TODO: install transitive closure
// TODO: extract graph; insert into history interp

const historyInterp = new IncrementalInterpreter(".", nullLoader);

function Main() {
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
      <EditableGraph
        interp={exampleInterp}
        runStmts={(stmts) => {
          stmts.forEach((stmt) => {
            const res = exampleInterp.processStmt(stmt);
            if (res.output.type === "EmissionLog") {
              res.output.log.forEach((item) => {
                item.output.forEach((logItem) => {
                  const data = logItem.data;
                  historyInterp.evalStmt({
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
      <Explorer interp={historyInterp} />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
