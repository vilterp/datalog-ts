import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { EditorState } from "../types";

export type Span = { from: number; to: number };

export type ActionContext = {
  interp: AbstractInterpreter;
  state: EditorState;
};

export type EditorAction = {
  name: string;
  available: (ctx: ActionContext) => boolean;
  apply: (ctx: ActionContext) => EditorState;
};
