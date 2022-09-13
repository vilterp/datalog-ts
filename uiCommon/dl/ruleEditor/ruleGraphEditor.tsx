import React, { useRef, useState } from "react";
import { node } from "../../../util/tree";

export type RuleGraph = {
  nodes: { [id: string]: GraphNode };
  edges: { fromID: string; toID: string }[];
};

type GraphNode = {
  pos: Point;
  desc: NodeDesc;
};

type NodeDesc = { type: "JoinVar" } | { type: "Relation"; name: string };

type Point = { x: number; y: number };

export function RuleGraphEditor(props: {
  ruleGraph: RuleGraph;
  setRuleGraph: (g: RuleGraph) => void;
}) {
  const svgRef = useRef();
  const [draggingID, setDraggingID] = useState<string | null>(null);

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
      onMouseUp={() => setDraggingID(null)}
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
          return (
            <g
              key={id}
              transform={`translate(${node.pos.x} ${node.pos.y})`}
              style={{ cursor: dragging ? "grabbing" : "grab" }}
              onMouseDown={() => setDraggingID(id)}
            >
              <NodeDesc nodeDesc={node.desc} dragging={dragging} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function NodeDesc(props: { nodeDesc: NodeDesc; dragging: boolean }) {
  switch (props.nodeDesc.type) {
    case "JoinVar":
      return <circle r={10} fill={props.dragging ? "red" : "blue"} />;
    case "Relation":
      return (
        <text
          textAnchor="middle"
          alignmentBaseline="middle"
          style={{ backgroundColor: "white", fontFamily: "monospace" }}
        >
          {props.nodeDesc.name}
        </text>
      );
  }
}

function updatePos(graph: RuleGraph, nodeID: string, newPos: Point): RuleGraph {
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [nodeID]: {
        ...graph.nodes[nodeID],
        pos: newPos,
      },
    },
  };
}

export const INITIAL_GRAPH: RuleGraph = {
  nodes: {
    0: {
      pos: {
        x: 100,
        y: 70,
      },
      desc: { type: "Relation", name: "parent" },
    },
    1: {
      pos: {
        x: 40,
        y: 70,
      },
      desc: { type: "JoinVar" },
    },
    2: {
      pos: {
        x: 150,
        y: 70,
      },
      desc: { type: "JoinVar" },
    },
  },
  edges: [
    { fromID: "0", toID: "1" },
    { fromID: "0", toID: "2" },
  ],
};
