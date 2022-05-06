import Editor, { useMonaco } from "@monaco-editor/react";
import React, { useEffect } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { EditorState } from "./types";

export function OpenCodeEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
  langName: string;
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
  );
}
