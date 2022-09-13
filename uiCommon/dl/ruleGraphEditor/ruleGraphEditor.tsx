import React, { useRef, useState } from "react";
import { TextWithBackground } from "./textWithBackground";
import {
  RuleGraph,
  NodeDesc,
  updatePos,
  getOverlappingJoinVars,
  combineNodes,
  JOIN_VAR_NODE_RADIUS,
} from "./model";
import { distance } from "../../../util/geom";

export function RuleGraphEditor(props: {
  ruleGraph: RuleGraph;
  setRuleGraph: (g: RuleGraph) => void;
}) {
  const svgRef = useRef();
  const [draggingID, setDraggingID] = useState<string | null>(null);
  const draggingNode = draggingID ? props.ruleGraph.nodes[draggingID] : null;
  const nodesOverlappingDraggingNode = draggingNode
    ? Object.entries(props.ruleGraph.nodes)
        .filter(
          ([id, node]) =>
            distance(draggingNode.pos, node.pos) < JOIN_VAR_NODE_RADIUS
        )
        .map(([id, node]) => id)
    : [];

  return (
    <svg
      ref={svgRef}
      onMouseMove={(evt) => {
        if (draggingID) {
          // @ts-ignore
          const rect = svgRef.current.getBoundingClientRect();
          const x = evt.clientX - rect.left;
          const y = evt.clientY - rect.top;
          props.setRuleGraph(
            updatePos(props.ruleGraph, draggingID, {
              x,
              y,
            })
          );
        }
      }}
      onMouseUp={() => {
        setDraggingID(null);
        const overlappingIDs = getOverlappingJoinVars(
          props.ruleGraph,
          draggingID
        );
        const newGraph = overlappingIDs.reduce(
          (graph, overlappingID) =>
            combineNodes(graph, draggingID, overlappingID),
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
          const dragging = draggingID === id;
          const overlapping =
            !dragging && nodesOverlappingDraggingNode.indexOf(id) !== -1;
          return (
            <g
              key={id}
              transform={`translate(${node.pos.x} ${node.pos.y})`}
              style={{ cursor: dragging ? "grabbing" : "grab" }}
              onMouseDown={() => setDraggingID(id)}
            >
              <NodeDesc
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

function NodeDesc(props: {
  nodeDesc: NodeDesc;
  dragging: boolean;
  overlapping: boolean;
}) {
  switch (props.nodeDesc.type) {
    case "JoinVar":
      return (
        <circle
          r={JOIN_VAR_NODE_RADIUS}
          fill={props.dragging ? "red" : props.overlapping ? "orange" : "blue"}
        />
      );
    case "Relation": {
      return (
        <TextWithBackground
          text={props.nodeDesc.name}
          textStyle={{ fontFamily: "monospace" }}
          backgroundStyle={{ fill: "white" }}
          padding={3}
        />
      );
    }
  }
}
