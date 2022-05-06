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
