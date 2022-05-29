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
  Res,
  Statement,
  str,
  StringLit,
  Array,
  Term,
} from "../../../core/types";
import { fastPPT } from "../../../core/fastPPT";
import { flatMap } from "../../../util/util";
import { getBaseRecord, statementsForNodeChange, withID } from "./util";
import { RemovableEdge } from "./removableEdge";
import { RemovableNode } from "./removableNode";
import { RemovableEdgeData, RemovableNodeData } from "./types";

export const dagEditor: VizTypeSpec = {
  name: "DAG Editor",
  description: "edit a DAG",
  component: DAGEditor,
};

function DAGEditor(props: VizArgs) {
  let nodeResults: Res[] = [];
  let edgeResults: Res[] = [];
  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let newNodeTemplates: Term[] = [];
  let error: string | null = null;

  try {
    const nodesQuery = props.spec.attrs.nodes as Rec;
    const edgesQuery = props.spec.attrs.edges as Rec;

    nodeResults = props.interp.queryRec(nodesQuery);
    edgeResults = props.interp.queryRec(edgesQuery);

    nodes = nodeResults.map((res) => {
      const rec = res.term as Rec;
      return {
        id: fastPPT(rec.attrs.id),
        type: "removableNode",
        data: {
          label: fastPPT(rec.attrs.label),
          onClick: () => {
            // TODO: also remove edges
            props.runStatements([
              { type: "Delete", record: getBaseRecord(res) },
            ]);
          },
        },
        position: {
          x: (rec.attrs.x as Int).val,
          y: (rec.attrs.y as Int).val,
        },
      };
    });
    edges = edgeResults.map((res) => {
      const rec = res.term as Rec;
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

    console.log("DAGEditor", { nodes, edges });

    newNodeTemplates = (props.spec.attrs.newNodes as Array).items;
  } catch (e) {
    error = e.toString();
    console.error(e);
  }

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const statements: Statement[] = flatMap(changes, (change) =>
        statementsForNodeChange(nodeResults, change)
      );
      props.runStatements(statements);
    },
    [nodeResults, props.runStatements]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      console.log("edges changes", changes);
    },
    [edgeResults, props.runStatements]
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
  const onAddNode = (template: Rec) => {
    const recWithPos = rec(template.relation, {
      ...template.attrs,
      x: int(50),
      y: int(50),
    });
    const newRec = withID(
      nodeResults.map((res) => res.term as Rec),
      recWithPos
    );
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
      <div style={{ width: 500, height: 400 }}>
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
      {newNodeTemplates.map((template) => (
        <button onClick={() => onAddNode(template as Rec)}>
          +{fastPPT(template)}
        </button>
      ))}
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
