import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { EditorBox } from "../editorCommon";
import { highlight } from "../highlight";
import { Suggestion } from "../suggestions";
import { ActionContext, EditorState, Problem } from "../types";
import { getSuggestions } from "./suggestions";

export function OpenCodeEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
  highlightCSS: string;
  problems: Problem[];
  lang: string;
  hideKeyBindingsTable?: boolean;
}) {
  const { highlighted, error, suggestions } = React.useMemo(() => {
    let highlighted: React.ReactNode = <>{props.editorState.source}</>;
    let error = null;
    let suggestions: Suggestion[] = [];
    if (props.validGrammar) {
      try {
        highlighted = highlight(
          props.interp,
          props.editorState.source,
          0,
          [],
          props.lang
        );
        suggestions = getSuggestions(props.interp);
      } catch (e) {
        error = e.toString();
      }
    }
    return { highlighted, error, suggestions };
  }, [props.interp, props.editorState.source, props.lang]);

  if (error) {
    console.error(
      `while highlighting and getting suggestions for ${props.lang}:`,
      error
    );
  }

  const actionCtx: ActionContext = {
    interp: props.interp,
    state: props.editorState,
    suggestions,
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
      hideKeyBindingsTable={props.hideKeyBindingsTable}
    />
  );
}
