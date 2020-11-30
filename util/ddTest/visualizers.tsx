import { Graphviz } from "graphviz-react";
import ReactJson from "react-json-view";
import React, { useState } from "react";
import { useWindowWidth } from "@react-hook/window-size";
import { EmissionLogAndGraph, formatRes } from "../../incremental/types";
import { toGraphviz } from "../../incremental/graphviz";
import { prettyPrintGraph } from "../../graphviz";
import { DagreReact } from "dagre-reactjs";
import { toDagre } from "../../incremental/dagre";

function EmissionLogViewer(props: { text: string }) {
  const logAndGraph: EmissionLogAndGraph = JSON.parse(props.text);

  const [highlightedNodeID, setHighlightedNodeID] = useState<string | null>(
    null
  );
  const [stage, setStage] = useState(0);
  const width = useWindowWidth();

  const graph = toDagre(logAndGraph.graph, highlightedNodeID);

  return (
    <div>
      <svg height={600} width={20000}>
        <DagreReact stage={stage} nodes={graph.nodes} edges={graph.edges} />
      </svg>
      <ul>
        {logAndGraph.log.map((batch, idx) => (
          <li
            key={idx}
            onClick={() => {
              setHighlightedNodeID(batch.fromID);
              setStage(stage + 1);
            }}
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
