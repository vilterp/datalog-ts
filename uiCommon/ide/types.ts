export type EditorState = {
  cursorPos: number;
  source: string;
};

export function initialEditorState(source: string): EditorState {
  return {
    cursorPos: 0,
    source,
  };
}

export type LangError =
  | { type: "ParseError"; expected: string[]; offset: number }
  | { type: "EvalError"; err: Error }
  | { type: "Problem"; problem: string; offset: number };
