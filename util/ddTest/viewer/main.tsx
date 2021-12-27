import React from "react";
import ReactDOM from "react-dom";
import useTitle from "@hookeasy/use-title";
import useHashParam from "use-hash-param";
import { VISUALIZERS } from "../visualizers";
import { lastItem } from "../../util";
import { Archive } from "../types";
import { useFetch } from "use-http";
import { Collapsible } from "../../../uiCommon/generic/collapsible";
import { buildTrie, trieToTree } from "../../trie";
import {
  emptyCollapseState,
  TreeView,
} from "../../../uiCommon/generic/treeView";
import { useJSONLocalStorage } from "../../../uiCommon/generic/hooks";

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
  const [collapseState, setCollapseState] = useJSONLocalStorage(
    "ddtest-viewer-collapse-state",
    emptyCollapseState
  );

  useTitle(`${lastItem((currentTest || "").split("/"))} | DDTest Viewer`);

  const paths = Object.keys(testArchive).map((path) => path.split("/"));
  const trie = buildTrie(paths);
  const tree = trieToTree(trie);

  return (
    <>
      <h1>DDTest Viewer</h1>
      <div style={{ display: "flex" }}>
        <div style={{ borderRight: "1px solid black", paddingRight: 10 }}>
          <TreeView<string>
            tree={tree}
            render={({ item, key, path, isLeaf }) => {
              if (key.length === 0) {
                return "/";
              }
              if (isLeaf) {
                const pathStr = path.join("/").slice(1);
                const isSelected = pathStr === currentTest;
                return (
                  <a
                    href={`/#?testPath=${encodeURIComponent(pathStr)}`}
                    style={{ fontWeight: isSelected ? "bold" : "normal" }}
                  >
                    {item}
                  </a>
                );
              }
              return key.length === 0 ? "/" : item;
            }}
            collapseState={collapseState}
            setCollapseState={setCollapseState}
          />
        </div>
        <div style={{ paddingLeft: 10 }}>
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
                      VISUALIZERS[pair.output.mimeType] ||
                      VISUALIZERS["text/plain"]
                    )(pair.output.content)}
                  </div>
                }
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
