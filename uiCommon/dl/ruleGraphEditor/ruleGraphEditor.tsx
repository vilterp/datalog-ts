import React, { useRef, useState } from "react";
import { TextWithBackground } from "./textWithBackground";
import {
  RuleGraph,
  NodeDesc as NodeDescView,
  updatePos,
  getOverlappingJoinVars,
  combineNodes,
  JOIN_VAR_NODE_RADIUS,
  GraphNode,
} from "./model";
import { minusPoint, Point } from "../../../util/geom";
import {
  mouseRelativeToElementCenter,
  mouseRelativeToElementTopLeft,
} from "./mouseUtil";

type DragState = { nodeID: string; offset: Point } | null;

export function RuleGraphEditor(props: {
  ruleGraph: RuleGraph;
  setRuleGraph: (g: RuleGraph) => void;
}) {
  const svgRef = useRef();
  const [dragState, setDragState] = useState<DragState>(null);
  const nodesOverlappingDraggingNode = dragState
    ? getOverlappingJoinVars(props.ruleGraph, dragState.nodeID)
    : [];

  return (
    <svg
      ref={svgRef}
      width={500}
      onMouseMove={(evt) => {
        evt.preventDefault();
        if (dragState) {
          const mousePos = mouseRelativeToElementTopLeft(svgRef, evt);
          const mouseMinusOffset = minusPoint(mousePos, dragState.offset);
          props.setRuleGraph(
            updatePos(props.ruleGraph, dragState.nodeID, mouseMinusOffset)
          );
        }
      }}
      onMouseUp={() => {
        setDragState(null);
        if (!dragState) {
          return;
        }
        const overlappingIDs = getOverlappingJoinVars(
          props.ruleGraph,
          dragState.nodeID
        );
        const newGraph = overlappingIDs.reduce(
          (graph, overlappingID) =>
            combineNodes(graph, dragState.nodeID, overlappingID),
          props.ruleGraph
        );
        props.setRuleGraph(newGraph);
      }}
    >
      <g>
        {props.ruleGraph.edges.map((edge) => {
          const fromNode = props.ruleGraph.nodes[edge.fromID];
          const toNode = props.ruleGraph.nodes[edge.toID];
          return (
            <line
              key={`${edge.fromID}-${edge.toID}`}
              x1={fromNode.pos.x}
              y1={fromNode.pos.y}
              x2={toNode.pos.x}
              y2={toNode.pos.y}
              style={{
                stroke: "black",
                strokeWidth: 2,
              }}
            />
          );
        })}
      </g>
      <g>
        {Object.entries(props.ruleGraph.nodes).map(([id, node]) => (
          <NodeView
            key={id}
            id={id}
            node={node}
            nodesOverlappingDraggingNode={nodesOverlappingDraggingNode}
            dragState={dragState}
            setDragState={(ds) => {
              setDragState(ds);
            }}
          />
        ))}
      </g>
    </svg>
  );
}

function NodeView(props: {
  id: string;
  node: GraphNode;
  nodesOverlappingDraggingNode: string[];
  dragState: DragState;
  setDragState: (ds: DragState) => void;
}) {
  const { id, node, dragState, setDragState, nodesOverlappingDraggingNode } =
    props;
  const dragging = dragState && dragState.nodeID === id;
  const draggedNodeOverlappingThis =
    nodesOverlappingDraggingNode.indexOf(id) !== -1;
  const thisDraggedOverSomeNode =
    dragging && nodesOverlappingDraggingNode.length > 0;
  const overlapping = draggedNodeOverlappingThis || thisDraggedOverSomeNode;
  const ref = useRef<SVGGraphicsElement>();
  return (
    <g
      ref={ref}
      transform={`translate(${node.pos.x} ${node.pos.y})`}
      style={{ cursor: dragging ? "grabbing" : "grab" }}
      onMouseDown={(evt) => {
        setDragState({
          nodeID: id,
          offset: mouseRelativeToElementCenter(ref, evt),
        });
      }}
    >
      <NodeDescView
        nodeDesc={node.desc}
        dragging={dragging}
        overlapping={overlapping}
      />
    </g>
  );
}

function NodeDescView(props: {
  nodeDesc: NodeDescView;
  dragging: boolean;
  overlapping: boolean;
}) {
  switch (props.nodeDesc.type) {
    case "JoinVar":
      return (
        <g>
          <circle
            r={JOIN_VAR_NODE_RADIUS}
            fill={props.overlapping ? "orange" : "blue"}
          />
          <text
            style={{ fill: "white", fontFamily: "monospace" }}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {props.nodeDesc.name}
          </text>
        </g>
      );
    case "Relation": {
      return (
        <TextWithBackground
          text={props.nodeDesc.name}
          textStyle={{ fontFamily: "monospace" }}
          backgroundStyle={{
            fill: props.nodeDesc.isHead ? "lightblue" : "white",
          }}
          padding={3}
        />
      );
    }
  }
}
