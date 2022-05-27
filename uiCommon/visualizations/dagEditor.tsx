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
import { int, Int, Rec, Statement, StringLit } from "../../core/types";
import { fastPPT } from "../../core/fastPPT";
import { flatMap } from "../../util/util";

export const dagEditor: VizTypeSpec = {
  name: "DAG Editor",
  description: "edit a DAG",
  component: DAGEditor,
};

function DAGEditor(props: VizArgs) {
  // const [nodes, setNodes] = useState(INITIAL_NODES);
  // const [edges, setEdges] = useState(initialEdges);
  let nodeRecords: Rec[] = [];
  let edgeRecords: Rec[] = [];
  let error: string | null = null;

  try {
    const nodesQuery = props.spec.attrs.nodes as Rec;
    const edgesQuery = props.spec.attrs.edges as Rec;

    nodeRecords = props.interp.queryRec(nodesQuery).map((r) => r.term as Rec);
    edgeRecords = props.interp.queryRec(edgesQuery).map((r) => r.term as Rec);
  } catch (e) {
    error = e.toString();
  }

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const statements: Statement[] = flatMap(changes, (change) => {
        if (change.type !== "position") {
          console.warn("change type not supported:", change);
          return [];
        }
        if (!change.position) {
          return [];
        }
        const rec = nodeRecords.find(
          (rec) => change.id === fastPPT(rec.attrs.id)
        );
        if (!rec) {
          throw new Error(`node not found for change ${change.id}`);
        }
        const updatedRec: Rec = {
          ...rec,
          attrs: {
            x: int(change.position.x),
            y: int(change.position.y),
          },
        };
        return [
          { type: "Delete", record: rec },
          { type: "Fact", record: updatedRec },
        ];
      });
      console.log("nodes changes", changes);
      // setNodes((nds) => applyNodeChanges(changes, nds));
      props.runStatements(statements);
    },
    [nodeRecords, props.runStatements]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      console.log("edges changes", changes);
      // setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [props.runStatements]
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("onConnect", connection);
      // setEdges((eds) => addEdge(connection, eds));
    },
    [props.runStatements]
  );

  const nodes: Node[] = nodeRecords.map((rec) => {
    return {
      id: fastPPT(rec.attrs.id),
      data: { label: (rec.attrs.label as StringLit).val },
      position: {
        x: (rec.attrs.x as Int).val,
        y: (rec.attrs.y as Int).val,
      },
    };
  });
  const edges: Edge[] = edgeRecords.map((rec) => {
    return {
      id: fastPPT(rec.attrs.id),
      source: fastPPT(rec.attrs.from),
      target: fastPPT(rec.attrs.to),
    };
  });

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
