import React from "react";
import useHashParam from "use-hash-param";
import ReactDOM from "react-dom";
import { VISUALIZERS } from "../util/ddTest/visualizers";
import { mapObjToList } from "../util";
import { Archive } from "../util/ddTest/types";
import { useFetch } from "use-http";
import { Collapsible } from "../uiCommon/collapsible";

function Main() {
  const [archiveURL] = useHashParam(
    "archiveUrl",
    `${window.location.origin}/test-archive.dd.json`
  );
  const { loading, error, data } = useFetch(archiveURL, {}, []);

  if (loading) {
    return <p>Loading...</p>;
  }
  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }
  return <TestViewer archive={data} />;
}

function TestViewer(props: { archive: Archive }) {
  const testArchive = props.archive;
  const [currentTest, setCurrentTest] = useHashParam(
    "testPath",
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
          <Collapsible
            heading={pair.input}
            content={(
              VISUALIZERS[pair.output.mimeType] || VISUALIZERS["text/plain"]
            )(pair.output.content)}
          />
        </div>
      ))}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
