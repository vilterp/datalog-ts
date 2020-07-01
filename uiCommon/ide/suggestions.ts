import { EditorState, EditorAction, ActionContext, Span } from "./types";
import { replaceAtSpan } from "./util";

export type Suggestion = {
  replacementSpan: Span;
  textToInsert: string;
  cursorOffsetAfter: number; // TODO: really should return list of placeholder spans
  display?: string;
  kind: string;
  bold: boolean;
};

export const insertSuggestionAction: EditorAction = {
  name: "Insert Suggestion",
  available(ctx: ActionContext): boolean {
    return ctx.suggestions.length > 0;
  },
  apply(ctx: ActionContext): EditorState {
    const sugg = ctx.suggestions[ctx.state.selectedSuggIdx];

    return {
      ...ctx.state,
      selectedSuggIdx: 0,
      source: replaceAtSpan(
        ctx.state.source,
        sugg.replacementSpan,
        sugg.textToInsert
      ),
      cursorPos: sugg.replacementSpan.from + sugg.cursorOffsetAfter,
    };
  },
};
