import React, { useState } from "react";
import ReactDOM from "react-dom";
import { parseDDTest } from "../util/ddTest/parser";
import { Graphviz } from "graphviz-react";
import ReactJson from "react-json-view";
import useLocalStorage from "react-use-localstorage";

function Main() {
  return <TestViewer />;
}

const FORMATTERS = {
  "text/plain": (text) => <pre>{text}</pre>,
  "application/graphviz": (text) => <Graphviz dot={text} />,
  "application/json": (text) => <ReactJson src={JSON.parse(text)} />,
};

function TestViewer() {
  const [testSource, setTestSource] = useLocalStorage(
    "ddtest-viewer-source",
    ""
  );
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
      {parsedTest.map((pair, idx) => (
        <div key={idx}>
          <pre>
            {pair.input}
            <br />
            ----
          </pre>
          {FORMATTERS[pair.output.mimeType](pair.output.content)}
        </div>
      ))}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
