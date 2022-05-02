import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { ppt } from "../../../core/pretty";
import { Rec, Res } from "../../../core/types";
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
  autofocus?: boolean;
  width?: number;
  height?: number;
}) {
  const { highlighted, error, suggestions, currentProblems, allProblems } =
    React.useMemo(() => {
      let highlighted: React.ReactNode = <>{props.editorState.source}</>;
      let error = null;
      let suggestions: Suggestion[] = [];
      let currentProblems: LangError[] = [];
      let allProblems: LangError[] = [];
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
          currentProblems = extractErrors(
            props.interp.queryStr("ide.CurrentProblem{desc: D, span: S}")
          );
          allProblems = extractErrors(
            props.interp.queryStr("tc.Problem{desc: D, span: S}")
          );
        } catch (e) {
          error = e.toString();
        }
      }
      return { highlighted, error, suggestions, currentProblems, allProblems };
    }, [props.interp, props.editorState.source, props.lang]);

  if (error) {
    console.error(
      `while highlighting and getting suggestions and errors for ${props.lang}:`,
      error
    );
  }

  const actionCtx: ActionContext = {
    interp: props.interp,
    state: props.editorState,
    suggestions,
    errors: [
      ...props.locatedErrors,
      ...filterMap(allProblems, (e) =>
        e.type === "Problem" ? { offset: e.offset } : null
      ),
    ],
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
      autofocus={props.autofocus}
      width={props.width}
      height={props.height}
    />
  );
}

function extractErrors(results: Res[]): LangError[] {
  return results.map((res) => {
    const rec = res.term as Rec;
    return {
      type: "Problem",
      problem: ppt(rec.attrs.desc),
      offset: dlToSpan(rec.attrs.span as Rec).from,
    };
  });
}
