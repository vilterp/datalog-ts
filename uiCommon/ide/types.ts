import { Rec, Term, Int } from "../../types";
import { Interpreter } from "../../incremental/interpreter";
import { Suggestion } from "./suggestions";

export type Span = { from: number; to: number };

export function dlToSpan(rec: Rec): Span {
  return {
    from: dlToPos(rec.attrs.from),
    to: dlToPos(rec.attrs.to),
  };
}

function dlToPos(term: Term): number {
  return (term as Int).val;
}

export type EditorState = {
  cursorPos: number;
  source: string;
  selectedSuggIdx: number;
};

export type ActionContext = {
  interp: Interpreter;
  state: EditorState;
  // TODO: remove suggestions param, for the sake of DRY?
  //   they can be computed from the repl, but will always have been computed
  //   by the editor already UI anyway; passing them for efficiency
  suggestions: Suggestion[];
  errors: { offset: number }[];
};

export type EditorAction = {
  name: string;
  available: (ctx: ActionContext) => boolean;
  apply: (ctx: ActionContext) => EditorState;
};

export function initialEditorState(source: string): EditorState {
  return {
    cursorPos: 0,
    selectedSuggIdx: 0,
    source,
  };
}

export function spanEq(left: Span, right: Span): boolean {
  return left.from === right.from && left.to === right.to;
}
