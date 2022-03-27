import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { ppt } from "../../../core/pretty";
import { Rec } from "../../../core/types";
import { filterMap } from "../../../util/util";
import { EditorBox } from "../editorCommon";
import { highlight } from "../highlight";
import { Suggestion } from "../suggestions";
import { ActionContext, dlToSpan, EditorState, LangError } from "../types";
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
  const { highlighted, error, suggestions, currentProblems } =
    React.useMemo(() => {
      let highlighted: React.ReactNode = <>{props.editorState.source}</>;
      let error = null;
      let suggestions: Suggestion[] = [];
      let currentProblems: LangError[] = [];
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
          currentProblems = props.interp
            .queryStr("tc.Problem{desc: D, span: S}")
            .map((res) => {
              const rec = res.term as Rec;
              return {
                type: "Problem",
                problem: ppt(rec.attrs.desc),
                offset: dlToSpan(rec.attrs.span as Rec).from,
              };
            });
        } catch (e) {
          error = e.toString();
        }
      }
      return { highlighted, error, suggestions, currentProblems };
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
    errors: [
      ...props.locatedErrors,
      ...filterMap(currentProblems, (e) =>
        e.type === "Problem" ? { offset: e.offset } : null
      ),
    ],
  };

  console.log("errors", { actionCtx: actionCtx.errors, currentProblems });

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
