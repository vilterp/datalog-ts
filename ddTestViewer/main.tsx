import React from "react";
import ReactDOM from "react-dom";

function Main() {
  return <TestViewer />;
}

function TestViewer() {
  return <p>Hello world</p>;
}

ReactDOM.render(<Main />, document.getElementById("main"));
