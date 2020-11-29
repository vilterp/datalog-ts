import React, { useState } from "react";
import ReactDOM from "react-dom";
import { parseDDTest } from "../util/dataDrivenTests";

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
      />
      <h3>Viewer</h3>
      <pre>{JSON.stringify(parsedTest, null, 2)}</pre>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
