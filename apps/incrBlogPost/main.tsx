import * as React from "react";
import * as ReactDOM from "react-dom";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { formatNodeDesc } from "../../core/incremental/pretty";
import { nullLoader } from "../../core/loaders";
import { ppb } from "../../core/pretty";
import { int, rec, Statement, str } from "../../core/types";
import { Explorer } from "../../uiCommon/explorer";
import { EditableGraph } from "./editableGraph";

function getInitialInterpreters(): {
  example: IncrementalInterpreter;
  history: IncrementalInterpreter;
} {
  // Initialize example interpreter
  let exampleInterp = new IncrementalInterpreter(".", nullLoader);
  exampleInterp = exampleInterp.evalStr(
    `.table node
  .table edge
  reachable{from: A, to: C} :-
    edge{from: A, to: C} |
    edge{from: A, to: B} &
    reachable{from: B, to: C}.
  internal.visualization{
    name: "Graph",
    spec: graphviz{
      nodes: node{id: ID},
      edges: edge{from: From, to: To}
    }
  }.`
  )[1] as IncrementalInterpreter;
  exampleInterp.queryStr("reachable{}?");
  // TODO: initial nodes and edges

  // Initialize history interpreter
  let historyInterp = new IncrementalInterpreter(".", nullLoader);
  historyInterp = historyInterp.evalStr(
    `.table history.step
  .table history.userAction
  .table dataflow.node
  .table dataflow.edge
  internal.visualization{
    name: "Graph",
    spec: graphviz{
      nodes: dataflow.node{id: ID},
      edges: dataflow.edge{from: From, to: To}
    }
  }.`
  )[1] as IncrementalInterpreter;

  // insert graph from example interpreter into history interpreter
  for (const [id, node] of exampleInterp.graph.nodes.entries()) {
    historyInterp = historyInterp.evalStmt({
      type: "Fact",
      record: rec("dataflow.node", {
        id: str(id),
        desc: str(formatNodeDesc(node.desc)),
      }),
    })[1] as IncrementalInterpreter;
  }
  for (const [fromID, toIDs] of exampleInterp.graph.edges.entries()) {
    for (const toID of toIDs) {
      historyInterp = historyInterp.evalStmt({
        type: "Fact",
        record: rec("dataflow.edge", {
          from: str(fromID),
          to: str(toID),
        }),
      })[1] as IncrementalInterpreter;
    }
  }

  return { example: exampleInterp, history: historyInterp };
}

const INITIAL_INTERPS = getInitialInterpreters();

function Main() {
  const [exampleInterp, setExampleInterp] = React.useState(
    INITIAL_INTERPS.example
  );
  const [historyInterp, dispatchHistoryInterp] = React.useReducer(
    (st: IncrementalInterpreter, action: Statement): IncrementalInterpreter =>
      st.evalStmt(action)[1] as IncrementalInterpreter,
    INITIAL_INTERPS.history
  );
  const [userStep, setUserStep] = React.useState(0);

  const runStmts = (stmts: Statement[]) => {
    setUserStep(userStep + 1);
    stmts.forEach((stmt) => {
      // update example interp
      const res = exampleInterp.processStmt(stmt);
      setExampleInterp(res.newInterp as IncrementalInterpreter);
      dispatchHistoryInterp({
        type: "Fact",
        record: rec("history.userAction", {
          id: int(userStep),
          record:
            stmt.type === "Fact"
              ? stmt.record
              : stmt.type === "Delete"
              ? stmt.record
              : rec("unreachable", {}), // TODO: throw error
          multiplicity: int(
            stmt.type === "Fact" ? 1 : stmt.type === "Delete" ? -1 : 0
          ),
        }),
      });
      // update history interp
      if (res.output.type === "EmissionLog") {
        res.output.log.forEach((item) => {
          item.output.forEach((logItem) => {
            const data = logItem.data;
            dispatchHistoryInterp({
              type: "Fact",
              record: rec("history.step", {
                userActionID: int(userStep),
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
  };

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
      <Explorer interp={exampleInterp} showViz />
      <EditableGraph interp={exampleInterp} runStmts={runStmts} />
      <p>
        You can add and remove nodes and edges, and see the transitive closure
        edges update.
      </p>
      <p>A log of what you've done can be seen in this explorer:</p>
      <Explorer interp={historyInterp} showViz />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
