import React from "react";
import ReactDOM from "react-dom";

function Main() {
  return (
    <>
      <h1>Datalog Typechecker</h1>
      <p>
        Superseded by <a href="https://lingo-workbench.dev">Lingo</a>, a
        language workbench which includes support for a simple functional
        language as well as other languages.
      </p>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
