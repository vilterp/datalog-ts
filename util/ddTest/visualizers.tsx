import { Graphviz } from "graphviz-react";
import ReactJson from "react-json-view";
import React, { useState } from "react";
import { useWindowWidth } from "@react-hook/window-size";
import { EmissionLogAndGraph, formatRes } from "../../incremental/types";
import { toGraphviz } from "../../incremental/graphviz";
import { prettyPrintGraph } from "../../graphviz";

function EmissionLogViewer(props: { text: string }) {
  const logAndGraph: EmissionLogAndGraph = JSON.parse(props.text);

  const [highlightedNodeID, setHighlightedNodeID] = useState<string | null>(
    null
  );
  const width = useWindowWidth();

  // TODO: running it through graphviz every time is way too slow
  const graph = toGraphviz(logAndGraph.graph, highlightedNodeID);
  const dot = prettyPrintGraph(graph);
  console.log({ graph, dot });

  return (
    <div>
      <Graphviz
        dot={dot}
        options={{ width, height: 500, fit: true, zoom: false }}
      />
      <ul>
        {logAndGraph.log.map((batch, idx) => (
          <li
            key={idx}
            onClick={() => setHighlightedNodeID(batch.fromID)}
            style={{
              cursor: "pointer",
              color: highlightedNodeID === batch.fromID ? "red" : "black",
            }}
          >
            {batch.fromID}: {batch.output.map((res) => formatRes(res))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GraphvizVisualizer(props: { dot: string }) {
  const width = useWindowWidth();
  return (
    <Graphviz
      dot={props.dot}
      options={{ width, height: 800, fit: true, zoom: false }}
    />
  );
}

export const VISUALIZERS = {
  "text/plain": (text) => <pre>{text}</pre>,
  "application/graphviz": (text) => <GraphvizVisualizer dot={text} />,
  "application/json": (text) => (
    <ReactJson
      name={null}
      enableClipboard={false}
      displayObjectSize={false}
      displayDataTypes={false}
      src={JSON.parse(text)}
    />
  ),
  "application/datalog": (text) => <pre>{text}</pre>,
  "incremental-datalog/trace": (text) => <EmissionLogViewer text={text} />,
};
