import { Rec, Term, Int } from "../../core/types";

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

export function initialEditorState(source: string): EditorState {
  return {
    cursorPos: 0,
    selectedSuggIdx: 0,
    source,
  };
}

export type LangError =
  | { type: "ParseError"; expected: string[]; offset: number }
  | { type: "EvalError"; err: Error }
  | { type: "Problem"; problem: string; offset: number };
