import Editor, { useMonaco } from "@monaco-editor/react";
import React, { useEffect } from "react";
import { EditorState } from "./types";

export function EditorBox(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  width?: number;
  height?: number;
}) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      console.log("hello, this is the monaco instance!", monaco);
    }
  }, [monaco]);

  const setSource = (source: string) => {
    props.setEditorState({ ...props.editorState, source });
  };

  return (
    <div>
      <div style={{ display: "flex" }}>
        <div
          style={{
            width: props.width || 510,
            height: props.height || 450,
            overflow: "auto",
            border: "1px solid black",
            marginBottom: 10,
          }}
        >
          <Editor
            width={props.width}
            height={props.height}
            value={props.editorState.source}
            onChange={setSource}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
