import React from "react";
import useHashParam from "use-hash-param";
import ReactDOM from "react-dom";
import { VISUALIZERS } from "../util/ddTest/visualizers";
// @ts-ignore
import testArchive from "../test-archive.dd.json";
import { mapObjToList } from "../util";
import { Archive } from "../util/ddTest/types";

function Main() {
  return <TestViewer />;
}

function TestViewer() {
  const [currentTest, setCurrentTest] = useHashParam(
    Object.keys(testArchive).sort()[0]
  );

  return (
    <>
      <h1>DDTest Viewer</h1>
      <select
        value={currentTest}
        onChange={(evt) => setCurrentTest(evt.target.value)}
      >
        {mapObjToList(testArchive as Archive, (filePath) => (
          <option key={filePath}>{filePath}</option>
        ))}
      </select>
      <h3>Viewer</h3>
      {(testArchive[currentTest] || []).map((pair, idx) => (
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
