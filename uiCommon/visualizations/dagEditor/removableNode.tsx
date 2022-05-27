import React from "React";
import { NodeProps, Handle } from "react-flow-renderer";
import { RemovableNodeData } from "./types";

export function RemovableNode(props: NodeProps<RemovableNodeData>) {
  return (
    <div
      style={{
        fontSize: 12,
        background: "#eee",
        border: "1px solid #555",
        borderRadius: 5,
        textAlign: "center",
        padding: 10,
        width: 150,
      }}
    >
      <Handle
        type="target"
        // @ts-ignore
        position="top"
        onConnect={(params) => console.log("handle onConnect", params)}
        isConnectable={props.isConnectable}
      />
      {props.data.label} <button onClick={() => props.data.onClick()}>×</button>
      <Handle
        type="source"
        // @ts-ignore
        position="bottom"
        id="b"
        isConnectable={props.isConnectable}
      />
    </div>
  );
}
