import React, { ComponentType, useCallback } from "react";
import { VizArgs, VizTypeSpec } from "../typeSpec";
import ReactFlow, {
  Node,
  Edge,
  EdgeChange,
  NodeChange,
  Connection,
  EdgeProps,
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
      type: "removableEdge",
      data: {
        onClick: () => {
          props.runStatements([{ type: "Delete", record: rec }]);
        },
      },
    };
  });

  return (
    <>
      <div style={{ width: 500, height: 300 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          edgeTypes={EDGE_TYPES}
        />
      </div>
      <button onClick={onAddNode}>Add Node</button>
    </>
  );
}

const EDGE_TYPES: { [name: string]: ComponentType<EdgeProps> } = {
  removableEdge: RemovableEdge,
};
