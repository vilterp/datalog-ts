import * as monaco from "monaco-editor";
import React, { useMemo } from "react";
import { LanguageSpec } from "../../languageWorkbench/languages";
import { EditorState } from "./types";
import { LingoEditorInner } from "./editorInner";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";
import { addCursor, constructInterp } from "../../languageWorkbench/interp";

export function LingoEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  langSpec: LanguageSpec;
  width?: number;
  height?: number;
  lineNumbers?: monaco.editor.LineNumbersType;
  showKeyBindingsTable?: boolean;
}) {
  // constructInterp has its own memoization, but that doesn't work across multiple LingoEditor
  // instances... sigh
  const interp = useMemo(
    () =>
      constructInterp(INIT_INTERP, props.langSpec, props.editorState.source)
        .interp,
    [props.langSpec, props.editorState.source]
  );
  // const interp = addCursor(withoutCursor, props.editorState.cursorPos);

  return (
    <LingoEditorInner
      interp={interp}
      editorState={props.editorState}
      setEditorState={props.setEditorState}
      langSpec={props.langSpec}
      width={props.width}
      height={props.height}
      lineNumbers={props.lineNumbers}
      showKeyBindingsTable={props.showKeyBindingsTable}
    />
  );
}
