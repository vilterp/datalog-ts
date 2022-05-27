import React from "React";
import { NodeProps, Handle } from "react-flow-renderer";
import { RemovableNodeData } from "./types";

export function RemovableNode(props: NodeProps<RemovableNodeData>) {
  return (
    <>
      <Handle
        type="target"
        // @ts-ignore
        position="top"
        // style={{ background: "#555" }}
        onConnect={(params) => console.log("handle onConnect", params)}
        isConnectable={props.isConnectable}
      />
      {props.data.label} <button onClick={() => props.data.onClick()}>×</button>
      <Handle
        type="source"
        // @ts-ignore
        position="bottom"
        id="b"
        // style={{ bottom: 10, top: "auto", background: "#555" }}
        isConnectable={props.isConnectable}
      />
    </>
  );
}
