import * as React from "react";
import { useState } from "react";

type Node = string;
type Edge = { from: string; to: string };

export function EditableGraph() {
  const [nodes, setNodes] = useState<Node[]>(["a", "b", "c"]);
  const [edges, setEdges] = useState<Edge[]>();
  const [nextNodeID, setNextNodeID] = useState(0);
  const [fromNodeID, setFromNodeID] = useState(nodes[0] || "");
  const [toNodeID, setToNodeID] = useState(nodes[0] || "");

  return (
    <div>
      <div>
        Nodes:
        <ul>
          {nodes.map((node) => (
            <li key={node}>
              {node}{" "}
              <button onClick={() => console.log("TODO: remove", node)}>
                X
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            setNodes([...nodes, nextNodeID.toString()]);
            setNextNodeID(nextNodeID + 1);
          }}
        >
          Add Node
        </button>
      </div>
      <div>
        Edges:
        <ul>
          {edges.map((edge) => (
            <li key={`${edge.from}-${edge.to}`}>
              {edge.from} {"->"} {edge.to}{" "}
              <button
                onClick={() => {
                  console.log("TODO: remove", edge);
                }}
              ></button>
            </li>
          ))}
        </ul>
        From:
        <select
          value={fromNodeID}
          onChange={(evt) => setFromNodeID(evt.target.value)}
        >
          {nodes.map((node) => (
            <option key={node}>{node}</option>
          ))}
        </select>
        To:
        <select
          value={toNodeID}
          onChange={(evt) => setToNodeID(evt.target.value)}
        >
          {nodes.map((node) => (
            <option key={node}>{node}</option>
          ))}
        </select>
        <button
          onClick={() => {
            setEdges([...edges, { from: fromNodeID, to: toNodeID }]);
          }}
        >
          Add Edge
        </button>
      </div>
    </div>
  );
}
