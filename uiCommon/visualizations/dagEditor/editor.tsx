import React, { ComponentType, useCallback } from "react";
import { VizArgs, VizTypeSpec } from "../typeSpec";
import ReactFlow, {
  Node,
  Edge,
  EdgeChange,
  NodeChange,
  Connection,
  EdgeProps,
  NodeProps,
} from "react-flow-renderer";
import {
  int,
  Int,
  rec,
  Rec,
  Statement,
  str,
  StringLit,
} from "../../../core/types";
import { fastPPT } from "../../../core/fastPPT";
import { flatMap } from "../../../util/util";
import { statementsForNodeChange, withID } from "./util";
import { RemovableEdge } from "./removableEdge";
import { RemovableNode } from "./removableNode";
import { RemovableEdgeData, RemovableNodeData } from "./types";

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
  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let error: string | null = null;

  try {
    const nodesQuery = props.spec.attrs.nodes as Rec;
    const edgesQuery = props.spec.attrs.edges as Rec;

    nodeRecords = props.interp.queryRec(nodesQuery).map((r) => r.term as Rec);
    edgeRecords = props.interp.queryRec(edgesQuery).map((r) => r.term as Rec);

    nodes = nodeRecords.map((rec) => {
      return {
        id: fastPPT(rec.attrs.id),
        type: "removableNode",
        data: {
          label: (rec.attrs.label as StringLit).val,
          onClick: () => {
            // TODO: also remove edges
            props.runStatements([{ type: "Delete", record: rec }]);
          },
        },
        position: {
          x: (rec.attrs.x as Int).val,
          y: (rec.attrs.y as Int).val,
        },
      };
    });
    edges = edgeRecords.map((rec) => {
      return {
        id: `${fastPPT(rec.attrs.from)}-${fastPPT(rec.attrs.to)}`,
        source: fastPPT(rec.attrs.from),
        target: fastPPT(rec.attrs.to),
        type: "removableEdge",
        data: {
          onClick: () => {
            props.runStatements([{ type: "Delete", record: rec }]);
          },
        },
      };
    });
  } catch (e) {
    error = e.toString();
    console.error(e);
  }

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const statements: Statement[] = flatMap(changes, (change) =>
        statementsForNodeChange(nodeRecords, change)
      );
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
    [edgeRecords, props.runStatements]
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log("onConnect", connection);
      const edgeRelation = (props.spec.attrs.newEdge as Rec).relation;
      // setEdges((eds) => addEdge(connection, eds));
      props.runStatements([
        {
          type: "Fact",
          record: rec(edgeRelation, {
            id: str(`${connection.source}-${connection.target}`),
            from: int(parseInt(connection.source)),
            to: int(parseInt(connection.target)),
          }),
        },
      ]);
    },
    [props.spec, props.runStatements]
  );
  const onAddNode = () => {
    const template = props.spec.attrs.newNode as Rec;
    const recWithPos = rec(template.relation, {
      x: int(50),
      y: int(50),
      label: str("new node"), // TODO: parameterize somehow
    });
    const newRec = withID(nodeRecords, recWithPos);
    props.runStatements([
      {
        type: "Fact",
        record: newRec,
      },
    ]);
  };

  return error !== null ? (
    <pre style={{ color: "red" }}>{error}</pre>
  ) : (
    <>
      <div style={{ width: 500, height: 300 }}>
        <ReactFlow
          edgeTypes={EDGE_TYPES}
          nodeTypes={NODE_TYPES}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        />
      </div>
      <button onClick={onAddNode}>Add Node</button>
    </>
  );
}

const EDGE_TYPES: {
  [name: string]: ComponentType<EdgeProps<RemovableEdgeData>>;
} = {
  removableEdge: RemovableEdge,
};

const NODE_TYPES: {
  [name: string]: ComponentType<NodeProps<RemovableNodeData>>;
} = {
  removableNode: RemovableNode,
};
