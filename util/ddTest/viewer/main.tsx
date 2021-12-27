import React from "react";
import ReactDOM from "react-dom";
import useTitle from "@hookeasy/use-title";
import useHashParam from "use-hash-param";
import { VISUALIZERS } from "../visualizers";
import { lastItem, mapObjToList } from "../../util";
import { Archive } from "../types";
import { useFetch } from "use-http";
import { Collapsible } from "../../../uiCommon/generic/collapsible";
import Select from "react-select";

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

  useTitle(`${lastItem((currentTest || "").split("/"))} | DDTest Viewer`);

  return (
    <>
      <h1>DDTest Viewer</h1>
      <Select
        onChange={(newVal) => setCurrentTest(newVal.value)}
        value={{ value: currentTest, label: currentTest }} // wtf react-select
        options={mapObjToList(testArchive, (testPath) => ({
          value: testPath,
          label: testPath,
        }))}
      />
      <h3>Viewer</h3>
      {(testArchive[currentTest] || []).map((pair, idx) => (
        <div key={idx}>
          <Collapsible
            id={pair.input}
            renderLabel={(collapsed) => (
              <div style={{ display: "flex" }}>
                <div style={{ fontFamily: "monospace" }}>
                  {collapsed ? ">" : "v"}
                </div>
                <pre
                  style={{
                    whiteSpace: "pre",
                    marginTop: 0,
                    marginBottom: 0,
                    paddingLeft: 10,
                  }}
                >
                  {pair.input}
                </pre>
              </div>
            )}
            content={
              <div style={{ paddingLeft: 17, marginBottom: 10 }}>
                <pre style={{ margin: 0 }}>----</pre>
                {(
                  VISUALIZERS[pair.output.mimeType] || VISUALIZERS["text/plain"]
                )(pair.output.content)}
              </div>
            }
          />
        </div>
      ))}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
