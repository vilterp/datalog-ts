import React, { useState } from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import ReactFlow from "react-flow-renderer";

export const dagEditor: VizTypeSpec = {
  name: "DAG Editor",
  description: "edit a DAG",
  component: DAGEditor,
};

function DAGEditor(props: VizArgs) {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(initialEdges);

  return <ReactFlow nodes={nodes} edges={edges} fitView />;
}

const INITIAL_NODES = [
  {
    id: "1",
    type: "input",
    data: { label: "Input Node" },
    position: { x: 250, y: 25 },
  },

  {
    id: "2",
    // you can also pass a React component as a label
    data: { label: <div>Default Node</div> },
    position: { x: 100, y: 125 },
  },
  {
    id: "3",
    type: "output",
    data: { label: "Output Node" },
    position: { x: 250, y: 250 },
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3", animated: true },
];
