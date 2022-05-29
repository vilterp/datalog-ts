import React from "react";
import { NodeProps, Handle } from "react-flow-renderer";
import { Rec } from "../../../core/types";
import { mapObjToList } from "../../../util/util";
import { BareTerm } from "../../dl/replViews";
import { TermEditor } from "./editors";
import { RemovableNodeData } from "./types";
import { getBaseRecord, getSpecForAttr } from "./util";

export function RemovableNode(props: NodeProps<RemovableNodeData>) {
  const rawRec = props.data.res.term as Rec;
  const rec = getBaseRecord(props.data.res);

  return (
    <div
      style={{
        fontSize: 12,
        background: "#eee",
        border: "1px solid #555",
        borderRadius: 5,
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
      <button onClick={() => props.data.onClick()}>×</button>
      <ul>
        {mapObjToList(rec.attrs, (attr, val) => {
          const attrEditorSpec = getSpecForAttr(
            props.data.editors,
            rec.relation,
            attr
          );
          // console.log("RemovableNode", {
          //   relation: rec.relation,
          //   attr,
          //   val,
          //   attrEditorSpec,
          //   editors: props.data.editors,
          // });
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
