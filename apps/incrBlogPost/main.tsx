import * as React from "react";
import * as ReactDOM from "react-dom";
import { EditableGraph } from "./editableGraph";

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
      <EditableGraph />
      <p>
        You can add and remove nodes and edges, and see the transitive closure
        edges update.
      </p>
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
