import React, { useState } from "react";
import ReactDOM from "react-dom";
import { parseDDTest } from "../util/ddTest/parser";

function Main() {
  return <TestViewer />;
}

function TestViewer() {
  const [testSource, setTestSource] = useState("");
  const parsedTest = parseDDTest(testSource);

  return (
    <>
      <h1>DDTest Viewer</h1>
      <h3>Test Source</h3>
      <textarea
        value={testSource}
        onChange={(evt) => setTestSource(evt.target.value)}
        style={{ fontFamily: "monospace" }}
        cols={100}
        rows={20}
      />
      <h3>Viewer</h3>
      <pre>{JSON.stringify(parsedTest, null, 2)}</pre>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
