import React from "react";
import { NodeProps, Handle } from "react-flow-renderer";
import { fastPPT } from "../../../core/fastPPT";
import { Rec } from "../../../core/types";
import { mapObjToList } from "../../../util/util";
import { BareTerm } from "../../dl/replViews";
import { TermEditor } from "./editors";
import { RemovableNodeData } from "./types";
import { getSpecForAttr } from "./util";

export function RemovableNode(props: NodeProps<RemovableNodeData>) {
  const rec = props.data.res.term as Rec;

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
      {fastPPT(rec.attrs.label)}{" "}
      <button onClick={() => props.data.onClick()}>×</button>
      <ul>
        {mapObjToList(rec.attrs, (attr, val) => {
          const attrEditorSpec = getSpecForAttr(
            props.data.editors,
            rec.relation,
            attr
          );
          return (
            <li key={attr}>
              {attr}:{" "}
              {attrEditorSpec ? (
                <TermEditor
                  spec={attrEditorSpec.editor}
                  term={val}
                  onChange={(newTerm) => {
                    console.log("TODO: handle new term", newTerm);
                  }}
                />
              ) : (
                <BareTerm term={val} />
              )}
            </li>
          );
        })}
      </ul>
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
