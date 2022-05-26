import React, { useCallback, useState } from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Node,
  Edge,
  addEdge,
  EdgeChange,
  NodeChange,
  Connection,
} from "react-flow-renderer";
import { Int, Rec, StringLit } from "../../core/types";
import { fastPPT } from "../../core/fastPPT";

export const dagEditor: VizTypeSpec = {
  name: "DAG Editor",
  description: "edit a DAG",
  component: DAGEditor,
};

function DAGEditor(props: VizArgs) {
  // const [nodes, setNodes] = useState(INITIAL_NODES);
  // const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      console.log("nodes changes", changes);
      // setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
    // [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      console.log("edges changes", changes);
      // setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
    // [setEdges]
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("onConnect", connection);
      // setEdges((eds) => addEdge(connection, eds));
    },
    []
    // [setEdges]
  );

  try {
    const nodesQuery = props.spec.attrs.nodes as Rec;
    const edgesQuery = props.spec.attrs.edges as Rec;

    const rawNodes = props.interp.queryRec(nodesQuery);
    const rawEdges = props.interp.queryRec(edgesQuery);

    const nodes: Node[] = rawNodes.map((rawNode) => {
      const rec = rawNode.term as Rec;
      return {
        id: fastPPT(rec.attrs.id),
        data: { label: (rec.attrs.label as StringLit).val },
        position: {
          x: (rec.attrs.x as Int).val,
          y: (rec.attrs.y as Int).val,
        },
      };
    });
    const edges: Edge[] = rawEdges.map((rawEdge) => {
      const rec = rawEdge.term as Rec;
      return {
        id: fastPPT(rec.attrs.id),
        source: fastPPT(rec.attrs.from),
        target: fastPPT(rec.attrs.to),
      };
    });

    console.log("DagEditor", { nodes, edges });

    return (
      <div style={{ width: 500, height: 400 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        />
      </div>
    );
  } catch (e) {
    return <pre style={{ color: "red" }}>Error: {e.toString()}</pre>;
  }
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
