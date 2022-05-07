import * as monaco from "monaco-editor";
import Editor, { Monaco, useMonaco } from "@monaco-editor/react";
import React, { useEffect, useRef } from "react";
import { LanguageSpec } from "../../languageWorkbench/languages";
import {
  getMarkers,
  idxFromPosition,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/monacoIntegration";
import { EditorState } from "./types";
import { patchKeyBinding } from "./patchKeyBindings";

export function LingoEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  langSpec: LanguageSpec;
  width?: number;
  height?: number;
}) {
  const monacoRef = useRef<typeof monaco>(null);
  function handleBeforeMount(monacoInstance: typeof monaco) {
    monacoRef.current = monacoInstance;
    registerLanguageSupport(monacoRef.current, props.langSpec);
  }

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }
    // make sure to register support for new langauge when we switch
    // languages.
    registerLanguageSupport(monacoRef.current, props.langSpec);
  }, [props.langSpec, monacoRef.current]);

  function updateMarkers(editor: monaco.editor.ICodeEditor) {
    const model = editor.getModel();
    const markers = getMarkers(props.langSpec, model);
    monacoRef.current.editor.setModelMarkers(model, "lingo", markers);
  }

  const editorRef = useRef<monaco.editor.ICodeEditor>(null);
  function handleOnMount(editor: monaco.editor.ICodeEditor) {
    editorRef.current = editor;

    updateMarkers(editor);
    updateKeyBindings(editor);

    editor.onDidChangeCursorPosition((evt) => {
      const value = editor.getModel().getValue();
      // TODO: can we get away without setting the value here?
      // tried not to earlier, and it made it un-editable...
      props.setEditorState({
        source: value,
        cursorPos: idxFromPosition(value, evt.position),
      });
    });
  }

  const setSource = (source: string) => {
    props.setEditorState({ ...props.editorState, source });
    updateMarkers(editorRef.current);
  };

  return (
    <div style={{ border: "1px solid black", padding: 5 }}>
      <Editor
        width={props.width || 570}
        height={props.height || 400}
        value={props.editorState.source}
        onChange={setSource}
        language={props.langSpec.name}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          "semanticHighlighting.enabled": true,
          lineNumbers: "off",
        }}
        beforeMount={handleBeforeMount}
        onMount={handleOnMount}
      />
    </div>
  );
}

function updateKeyBindings(editor: monaco.editor.ICodeEditor) {
  patchKeyBinding(
    editor,
    "editor.action.revealDefinition",
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB
  );
  patchKeyBinding(
    editor,
    "editor.action.goToReferences",
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU
  );
  patchKeyBinding(
    editor,
    "editor.action.marker.next", // go to next problem
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE
  );
  patchKeyBinding(
    editor,
    "editor.action.rename",
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ
  );
}
