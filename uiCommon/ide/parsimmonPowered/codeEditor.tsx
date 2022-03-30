import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { highlight } from "../highlight";
import Parsimmon from "parsimmon";
import { Suggestion } from "../suggestions";
import { Rec, Term } from "../../../core/types";
import { getNodesMissingTypes, DLTypeError } from "../errors";
import { EditorState, LangError, ActionContext } from "../types";
import { EditorBox } from "../editorCommon";

export function loadInterpreter<AST>(
  initialInterp: AbstractInterpreter,
  state: EditorState,
  parse: Parsimmon.Parser<AST>,
  flatten: (t: AST) => Term[]
): { interp: AbstractInterpreter; error: LangError | null } {
  let interp = initialInterp;
  let error: LangError | null = null;

  interp = interp.evalStr(`ide.Cursor{idx: ${state.cursorPos}}.`)[1];

  const parseRes = parse.parse(state.source);
  if (parseRes.status === false) {
    error = {
      type: "ParseError",
      expected: parseRes.expected,
      offset: parseRes.index.offset,
    };
  } else {
    try {
      const flattened = flatten(parseRes.value);
      interp = flattened.reduce<AbstractInterpreter>(
        (curInterp, rec) => curInterp.insert(rec as Rec),
        interp
      );
    } catch (e) {
      error = { type: "EvalError", err: e };
      console.error("eval error", error.err);
    }
  }

  return { interp, error };
}

export function CodeEditor(props: {
  interp: AbstractInterpreter;
  getSuggestions: (interp: AbstractInterpreter) => Suggestion[];
  highlightCSS: string;
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  loadError: LangError | null;
  lang: string;
  autofocus?: boolean;
}) {
  let evalError: LangError | null = null;
  let suggestions: Suggestion[] = [];
  let typeErrors: DLTypeError[] = [];
  try {
    // get suggestions
    suggestions = props.getSuggestions(props.interp);
    typeErrors = getNodesMissingTypes(props.interp);
  } catch (e) {
    evalError = { type: "EvalError", err: e };
    console.error("eval error", evalError.err);
  }

  if (typeErrors.length > 0) {
    console.log("type errors", typeErrors);
  }
  const locatedErrors: { offset: number }[] = [
    ...typeErrors.map((e) => ({ offset: e.span.from })),
    ...(props.loadError && props.loadError.type === "ParseError"
      ? [{ offset: props.loadError.offset }]
      : []),
  ];

  const actionCtx: ActionContext = {
    interp: props.interp,
    state: props.editorState,
    suggestions,
    errors: locatedErrors,
  };
  const errorsToDisplay = [evalError, props.loadError].filter(
    (x) => x !== null
  );
  const highlighted = highlight(
    props.interp,
    props.editorState.source,
    props.loadError && props.loadError.type === "ParseError"
      ? props.loadError.offset
      : null,
    typeErrors,
    props.lang
  );

  return (
    <EditorBox
      actionCtx={actionCtx}
      editorState={props.editorState}
      setEditorState={props.setEditorState}
      errorsToDisplay={errorsToDisplay}
      highlightCSS={props.highlightCSS}
      highlighted={highlighted}
      suggestions={suggestions}
      autofocus={props.autofocus}
    />
  );
}
