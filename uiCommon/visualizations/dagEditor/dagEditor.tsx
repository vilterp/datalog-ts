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
  Array,
  Term,
  StringLit,
} from "../../../core/types";
import { fastPPT } from "../../../core/fastPPT";
import { flatMap } from "../../../util/util";
import {
  deleteNodeAndConnectedEdges,
  dlToPos,
  getBaseRecord,
  getEditorSpecs,
  posToDL,
  statementsForNodeChange,
  withID,
} from "./util";
import { RemovableEdge } from "./removableEdge";
import { EditorNode } from "./editorNode";
import {
  AttributeEditorSpec,
  RemovableEdgeData,
  EditorNodeData,
  NodeVisualizationSpec,
} from "./types";

export const dagEditor: VizTypeSpec = {
  name: "DAG Editor",
  description: "edit a DAG",
  component: DAGEditor,
};

function DAGEditor(props: VizArgs) {
  let nodeResults: Res[] = [];
  let edgeResults: Res[] = [];
  let nodes: Node<EditorNodeData>[] = [];
  let edges: Edge<RemovableEdgeData>[] = [];
  let newNodeTemplates: Term[] = [];
  let attrEditorSpecs: AttributeEditorSpec[] = [];
  let nodeVisualizations: NodeVisualizationSpec[] = [];
  let error: string | null = null;

  try {
    const nodesQuery = props.spec.attrs.nodes as Rec;
    const edgesQuery = props.spec.attrs.edges as Rec;

    nodeResults = props.interp.queryRec(nodesQuery);
    edgeResults = props.interp.queryRec(edgesQuery);
    attrEditorSpecs = getEditorSpecs(
      props.interp
        .queryStr("internal.attrEditor{}?")
        .map((res) => res.term as Rec)
    );

    nodeVisualizations = props.interp
      .queryStr("internal.dagEditor.nodeViz{}?")
      .map((res) => {
        const rec = res.term as Rec;
        return {
          relation: (rec.attrs.relation as StringLit).val,
          vizSpec: rec.attrs.viz as Rec,
        };
      });

    nodes = nodeResults.map((res) => {
      const rec = res.term as Rec;
      const baseRec = getBaseRecord(res);
      return {
        id: fastPPT(rec.attrs.id),
        type: "editorNode",
        dragHandle: ".custom-drag-handle",
        data: {
          res: res,
          editors: attrEditorSpecs,
          nodeVizSpecs: nodeVisualizations,
          onDelete: () => {
            props.runStatements(
              deleteNodeAndConnectedEdges(props.interp, edgesQuery, res)
            );
          },
          onChange: (newTerm) => {
            props.runStatements([
              { type: "Delete", record: baseRec },
              { type: "Fact", record: newTerm as Rec },
            ]);
          },
          overallSpec: props,
        },
        position: dlToPos(rec.attrs.pos as Rec),
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
      pos: posToDL({ x: 50, y: 50 }),
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
      <div style={{ width: 1100, height: 900 }}>
        <ReactFlow
          edgeTypes={EDGE_TYPES}
          nodeTypes={NODE_TYPES}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          zoomOnScroll={false}
        />
      </div>
      {newNodeTemplates.map((template) => (
        <button
          key={fastPPT(template)}
          onClick={() => onAddNode(template as Rec)}
        >
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
  [name: string]: ComponentType<NodeProps<EditorNodeData>>;
} = {
  editorNode: EditorNode,
};
