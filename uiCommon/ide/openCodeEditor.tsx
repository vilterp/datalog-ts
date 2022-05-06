import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { EditorBox } from "./editorCommon";
import { EditorState } from "./types";

export function OpenCodeEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
  highlightCSS: string;
  locatedErrors: { offset: number }[];
  lang: string;
  autofocus?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <EditorBox
      highlightCSS={props.highlightCSS}
      actionCtx={actionCtx}
      editorState={props.editorState}
      setEditorState={props.setEditorState}
      errorsToDisplay={currentProblems} // TODO: pass through more errors
      highlighted={highlighted}
      suggestions={suggestions}
      autofocus={props.autofocus}
      width={props.width}
      height={props.height}
    />
  );
}
