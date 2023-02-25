import * as React from "react";
import { useState } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, rec, Statement, str, StringLit } from "../../core/types";

type Node = string;
type Edge = { from: string; to: string };

export function EditableGraph(props: {
  interp: AbstractInterpreter;
  runStmts: (stmts: Statement[]) => void;
}) {
  const nodes: Node[] = props.interp
    .queryStr("node{}?")
    .map((res) => ((res.term as Rec).attrs.id as StringLit).val);
  const edges: Edge[] = props.interp.queryStr("edge{}?").map((res) => {
    const rec = res.term as Rec;
    return {
      from: (rec.attrs.from as StringLit).val,
      to: (rec.attrs.to as StringLit).val,
    };
  });

  // TODO: use letters
  const [nextNodeID, setNextNodeID] = useState(0);
  const [fromNodeID, setFromNodeID] = useState(nodes[0] || "");
  const [toNodeID, setToNodeID] = useState(nodes[0] || "");

  return (
    <div style={{ border: "1px solid black" }}>
      <div>
        Nodes:
        <ul>
          {nodes.map((node) => (
            <li key={node}>
              {node}{" "}
              <button
                onClick={() =>
                  props.runStmts([
                    { type: "Delete", record: rec("node", { id: str(node) }) },
                  ])
                }
              >
                X
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            props.runStmts([
              {
                type: "Fact",
                record: rec("node", { id: str(nextNodeID.toString()) }),
              },
            ]);
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
                onClick={() =>
                  props.runStmts([
                    {
                      type: "Delete",
                      record: rec("edge", {
                        from: str(edge.from),
                        to: str(edge.to),
                      }),
                    },
                  ])
                }
              >
                X
              </button>
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
          onClick={() =>
            props.runStmts([
              {
                type: "Fact",
                record: rec("edge", {
                  from: str(fromNodeID),
                  to: str(toNodeID),
                }),
              },
            ])
          }
        >
          Add Edge
        </button>
      </div>
    </div>
  );
}
