import { Graphviz } from "graphviz-react";
import ReactJson from "react-json-view";
import React, { useState } from "react";
import { useWindowWidth } from "@react-hook/window-size";
import { EmissionLogAndGraph, formatRes } from "../../incremental/types";
import { toGraphviz } from "../../incremental/graphviz";
import { prettyPrintGraph } from "../../graphviz";
import { DagreReact } from "dagre-reactjs";
import { toDagre } from "../../incremental/dagre";
import Digraph from "@jaegertracing/plexus/lib/DirectedGraph";
import { TEdge, TVertex } from "@jaegertracing/plexus/lib/types";
import { LayoutManager } from "@jaegertracing/plexus";

const lm = new LayoutManager({
  useDotEdges: true,
  rankdir: "TB",
  ranksep: 1.1,
});

function EmissionLogViewer(props: { text: string }) {
  const logAndGraph: EmissionLogAndGraph = JSON.parse(props.text);

  const [highlightedNodeID, setHighlightedNodeID] = useState<string | null>(
    null
  );
  const width = useWindowWidth();

  const graph = toGraphviz(logAndGraph.graph, highlightedNodeID);
  const nodes: TVertex[] = graph.nodes.map((node) => ({
    key: node.id,
    label: node.attrs.label,
  }));
  const edges: TEdge[] = graph.edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
  }));

  return (
    <div>
      <Digraph
        setOnGraph={{
          style: {
            fontFamily: "sans-serif",
            height: "100%",
            position: "fixed",
            width: "100%",
          },
        }}
        zoom={true}
        edges={edges}
        vertices={nodes}
        layoutManager={lm}
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
