import React, { useRef, useState, MouseEvent, Ref } from "react";
import { TextWithBackground } from "./textWithBackground";
import {
  RuleGraph,
  NodeDesc as NodeDescView,
  updatePos,
  getOverlappingJoinVars,
  combineNodes,
  JOIN_VAR_NODE_RADIUS,
} from "./model";
import { Point } from "../../../util/geom";

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
        if (dragState) {
          props.setRuleGraph(
            updatePos(
              props.ruleGraph,
              dragState.nodeID,
              mouseRelativeToSVG(svgRef, evt)
            )
          );
        }
      }}
      onMouseUp={() => {
        setDragState(null);
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
        {Object.entries(props.ruleGraph.nodes).map(([id, node]) => {
          const dragging = dragState && dragState.nodeID === id;
          const draggedNodeOverlappingThis =
            nodesOverlappingDraggingNode.indexOf(id) !== -1;
          const thisDraggedOverSomeNode =
            dragging && nodesOverlappingDraggingNode.length > 0;
          const overlapping =
            draggedNodeOverlappingThis || thisDraggedOverSomeNode;
          return (
            <g
              key={id}
              transform={`translate(${node.pos.x} ${node.pos.y})`}
              style={{ cursor: dragging ? "grabbing" : "grab" }}
              onMouseDown={(evt) =>
                setDragState({
                  nodeID: id,
                  offset: { x: evt.clientX, y: evt.clientY },
                })
              }
            >
              <NodeDescView
                nodeDesc={node.desc}
                dragging={dragging}
                overlapping={overlapping}
              />
            </g>
          );
        })}
      </g>
    </svg>
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
        <circle
          r={JOIN_VAR_NODE_RADIUS}
          fill={props.overlapping ? "orange" : "blue"}
        />
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

function mouseRelativeToSVG(svgRef: Ref<SVGElement>, evt: MouseEvent): Point {
  // @ts-ignore
  const svgRect = svgRef.current.getBoundingClientRect();
  const x = evt.clientX - svgRect.left;
  const y = evt.clientY - svgRect.top;
  return { x, y };
}
