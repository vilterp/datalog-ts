import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { ppt } from "../../../core/pretty";
import { Rec } from "../../../core/types";
import { EditorBox } from "../editorCommon";
import { highlight } from "../highlight";
import { Suggestion } from "../suggestions";
import { ActionContext, EditorState, LangError } from "../types";
import { getSuggestions } from "./suggestions";

export function OpenCodeEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
  highlightCSS: string;
  locatedErrors: { offset: number }[];
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

  const currentProblems: LangError[] = props.interp
    .queryStr("ide.CurrentProblem{desc: D}")
    .map((res) => {
      const rec = res.term as Rec;
      return { type: "Problem", problem: ppt(rec.attrs.desc) };
    });

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
      errorsToDisplay={currentProblems} // TODO: pass through more errors
      highlighted={highlighted}
      suggestions={suggestions}
      hideKeyBindingsTable={props.hideKeyBindingsTable}
    />
  );
}
