import React, { useCallback, useState } from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Node,
  Edge,
} from "react-flow-renderer";

export const dagEditor: VizTypeSpec = {
  name: "DAG Editor",
  description: "edit a DAG",
  component: DAGEditor,
};

function DAGEditor(props: VizArgs) {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: 500, height: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
    </div>
  );
}

const INITIAL_NODES: Node[] = [
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

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3", animated: true },
];
