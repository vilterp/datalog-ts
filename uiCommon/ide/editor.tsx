import * as monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import React, { useEffect, useMemo, useRef } from "react";
import {
  getMarkers,
  idxFromPosition,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/monacoIntegration";
import { EditorState } from "./types";
import { addKeyBinding, removeKeyBinding } from "./patchKeyBindings";
import { KeyBindingsTable } from "./keymap/keyBindingsTable";
import { addCursor } from "../../languageWorkbench/interpCache";
import { LanguageSpec } from "../../languageWorkbench/common/types";
import { CACHE } from "../../languageWorkbench/vscode/common";
import { DEFAULT_KEY_MAP, KeyMap } from "./keymap/keymap";

export function LingoEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  langSpec: LanguageSpec;
  width?: number;
  height?: number;
  lineNumbers?: monaco.editor.LineNumbersType;
  showKeyBindingsTable?: boolean;
  keyMap?: KeyMap;
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

  const keyMap = props.keyMap || DEFAULT_KEY_MAP;

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
    Object.keys(keyMap).map((actionID) => {
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
      Object.keys(keyMap).map((actionID) => {
        addKeyBinding(editor, actionID, keyMap[actionID].combo);
      });
    });

    editor.onDidBlurEditorText(() => {
      Object.keys(keyMap).map((actionID) => {
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
  const withoutCursor = useMemo(() => {
    const res = CACHE.getInterpForDoc(
      props.langSpec.name,
      { [props.langSpec.name]: props.langSpec },
      `test.${props.langSpec.name}`,
      props.editorState.source
    );
    return res;
  }, [props.langSpec, props.editorState.source]);
  const interp = addCursor(withoutCursor.interp, props.editorState.cursorPos);

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
          keyMap={keyMap}
          actionCtx={{
            interp,
            state: props.editorState,
          }}
        />
      ) : null}
    </div>
  );
}
