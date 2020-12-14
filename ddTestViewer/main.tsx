import React from "react";
import ReactDOM from "react-dom";
import { parseDDTest } from "../util/ddTest/parser";
import useLocalStorage from "react-use-localstorage";
import { VISUALIZERS } from "../util/ddTest/visualizers";

function Main() {
  return <TestViewer />;
}

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
          {(VISUALIZERS[pair.output.mimeType] || VISUALIZERS["text/plain"])(
            pair.output.content
          )}
        </div>
      ))}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
