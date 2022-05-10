import * as monaco from "monaco-editor";
import React from "react";
import { LanguageSpec } from "../../languageWorkbench/languages";
import { EditorState } from "./types";
import { LingoEditorInner } from "./editorInner";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";
import { constructInterp } from "../../languageWorkbench/interp";

export function LingoEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  langSpec: LanguageSpec;
  width?: number;
  height?: number;
  lineNumbers?: monaco.editor.LineNumbersType;
  showKeyBindingsTable?: boolean;
}) {
  console.log("render editor", props.editorState);
  // constructInterp has its own memoization, but that doesn't work across multiple LingoEditor
  // instances... sigh

  const setSource = (newSource: string) => {
    const newInterp = constructInterp(
      INIT_INTERP,
      props.langSpec,
      newSource
    ).interp;
    props.setEditorState({
      ...props.editorState,
      interp: newInterp,
    });
  };
  const setCursorPos = (newPos: number) => {
    props.setEditorState({
      ...props.editorState,
      cursorPos: newPos,
    });
  };

  return (
    <LingoEditorInner
      editorState={props.editorState}
      setCursorPos={setCursorPos}
      setSource={setSource}
      langSpec={props.langSpec}
      width={props.width}
      height={props.height}
      lineNumbers={props.lineNumbers}
      showKeyBindingsTable={props.showKeyBindingsTable}
    />
  );
}
