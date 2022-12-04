import * as monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import React, { useEffect, useMemo, useRef } from "react";
import { LanguageSpec } from "../../languageWorkbench/languages";
import {
  getMarkers,
  idxFromPosition,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/monacoIntegration";
import { EditorState } from "./types";
import { addKeyBinding, removeKeyBinding } from "./patchKeyBindings";
import { KeyBindingsTable } from "./keymap/keyBindingsTable";
import { addCursor, getInterpForDoc } from "../../languageWorkbench/interp";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";

export function LingoEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  langSpec: LanguageSpec;
  width?: number;
  height?: number;
  lineNumbers?: monaco.editor.LineNumbersType;
  showKeyBindingsTable?: boolean;
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

    editor.onDidChangeCursorPosition((evt) => {
      const value = editor.getModel().getValue();
      // TODO: can we get away without setting the value here?
      // tried not to earlier, and it made it un-editable...
      props.setEditorState({
        source: value,
        cursorPos: idxFromPosition(value, evt.position),
      });
    });

    // Remove key bindings that are already there
    Object.keys(KEY_MAP).map((actionID) => {
      removeKeyBinding(editor, actionID);
    });

    // When an editor focuses, bind. When it blurs, unbind.
    // This is hacking around the fact that if we just patch the
    // bindings on each editor, they'll interfere with each other...
    // i.e. jump-to-defn on one will try to jump to another :facepalm:
    // TODO: file this as an issue in Monaco, lol.
    // This is not great because every time we add or remove, we're pushing something
    // onto the end of a list inside Monaco, so we're accumulating memory over time... oh well lol.
    editor.onDidFocusEditorText(() => {
      Object.keys(KEY_MAP).map((actionID) => {
        addKeyBinding(editor, actionID, KEY_MAP[actionID]);
      });
    });

    editor.onDidBlurEditorText(() => {
      Object.keys(KEY_MAP).map((actionID) => {
        removeKeyBinding(editor, actionID);
      });
    });
  }

  const setSource = (source: string) => {
    props.setEditorState({ ...props.editorState, source });
    updateMarkers(editorRef.current);
  };

  // constructInterp has its own memoization, but that doesn't work across multiple LingoEditor
  // instances... sigh
  const withoutCursor = useMemo(
    () =>
      getInterpForDoc(INIT_INTERP, props.langSpec, props.editorState.source)
        .interp,
    [props.langSpec, props.editorState.source]
  );
  const interp = addCursor(withoutCursor, props.editorState.cursorPos);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ border: "1px solid black", padding: 5 }}>
        <Editor
          width={props.width || 500}
          height={props.height || 400}
          value={props.editorState.source}
          onChange={setSource}
          language={props.langSpec.name}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            "semanticHighlighting.enabled": true,
            lineNumbers: props.lineNumbers || "on",
          }}
          beforeMount={handleBeforeMount}
          onMount={handleOnMount}
        />
      </div>
      {props.showKeyBindingsTable ? (
        <KeyBindingsTable
          actionCtx={{
            interp,
            state: props.editorState,
          }}
        />
      ) : null}
    </div>
  );
}

// matches uiCommon/ide/editor.tsx
// TODO: DRY up
const KEY_MAP = {
  "editor.action.revealDefinition": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
  "editor.action.goToReferences": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU,
  "editor.action.marker.next": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
  "editor.action.rename": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ,
};
