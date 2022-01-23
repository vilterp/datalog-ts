import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { EditorBox } from "../editorCommon";
import { highlight } from "../highlight";
import { ActionContext, EditorState } from "../types";
import { getSuggestions } from "./suggestions";

export function CodeEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
  highlightCSS: string;
  locatedErrors: { offset: number }[];
}) {
  let highlighted: React.ReactNode = <>{props.editorState.source}</>;
  let error = null;
  if (props.validGrammar) {
    try {
      highlighted = highlight(props.interp, props.editorState.source, 0, []);
    } catch (e) {
      error = e.toString();
    }
  }

  const suggestions = getSuggestions(props.interp);

  const actionCtx: ActionContext = {
    interp: props.interp,
    state: props.editorState,
    suggestions,
    errors: props.locatedErrors,
  };

  return (
    <EditorBox
      highlightCSS={props.highlightCSS}
      actionCtx={actionCtx}
      editorState={props.editorState}
      setEditorState={props.setEditorState}
      errorsToDisplay={[]} // TODO: pass through errors
      highlighted={highlighted}
      suggestions={suggestions}
    />
  );
}
