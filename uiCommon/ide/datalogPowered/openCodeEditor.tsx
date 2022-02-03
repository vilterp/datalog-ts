import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { EditorBox } from "../editorCommon";
import { highlight } from "../highlight";
import { Suggestion } from "../suggestions";
import { ActionContext, EditorState } from "../types";
import { getSuggestions } from "./suggestions";

export function OpenCodeEditor(props: {
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

  let suggestions: Suggestion[] = [];
  try {
    suggestions = getSuggestions(props.interp);
  } catch (e) {
    console.warn("error while getting suggestions:", e);
  }

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
