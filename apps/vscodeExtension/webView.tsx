import React from "react";
import ReactDOM from "react-dom";

export function Main() {
  return <p>Hello web view!</p>;
}

ReactDOM.render(<Main />, document.getElementById("main"));
