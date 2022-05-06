import Editor, { useMonaco } from "@monaco-editor/react";
import React, { useEffect } from "react";
import { LanguageSpec } from "../../languageWorkbench/languages";
import { registerLanguageSupport } from "../../languageWorkbench/vscode/monacoIntegration";
import { EditorState } from "./types";

export function LingoEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  langSpec: LanguageSpec;
  width?: number;
  height?: number;
}) {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) {
      return;
    }

    registerLanguageSupport(props.langSpec);
  }, [monaco]);

  const setSource = (source: string) => {
    props.setEditorState({ ...props.editorState, source });
  };

  return (
    <div>
      <Editor
        width={props.width || 570}
        height={props.height || 400}
        value={props.editorState.source}
        onChange={setSource}
        language={props.langSpec.name}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
