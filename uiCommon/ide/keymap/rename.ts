import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { Rec } from "../../../core/types";
import { dlToSpan } from "../../../languageWorkbench/sourcePositions";
import { flatMap, uniqBy } from "../../../util/util";
import { EditorState } from "../types";
import { ActionContext, EditorAction, Span } from "./types";
import {
  getCursor,
  replaceAtSpan,
  sortSpans,
  spanContainsIdx,
  spanLength,
} from "./util";

export const renameRefactorAction: EditorAction = {
  name: "Rename",
  available(ctx: ActionContext): boolean {
    return getSpansToReplace(ctx.interp).length > 0;
  },
  apply(ctx: ActionContext): EditorState {
    const spans = getSpansToReplace(ctx.interp);
    const currentText = textAtSpan(ctx.state.source, spans[0]);
    const newText = window.prompt("new text", currentText); // TODO: do this inline or something. lol
    const cursor = getCursor(ctx.interp);
    const cursorSpanIdx = spans.findIndex((span) =>
      spanContainsIdx(span, cursor)
    );
    const newSpans = getNewSpans(spans, newText.length);
    return {
      ...ctx.state,
      source: replaceAtSpans(ctx.state.source, spans, newText),
      cursorPos: newSpans[cursorSpanIdx].to,
    };
  },
};

function getSpansToReplace(interp: AbstractInterpreter): Span[] {
  const results = interp.queryStr(
    "ide.RenameCandidate{defnLoc: DL, usageLoc: UL}"
  );
  return sortSpans(
    uniqBy(
      (s) => `${s.from}`,
      flatMap(results, (res) => {
        const rec = res.term as Rec;
        return [
          dlToSpan(rec.attrs.defnLoc as Rec),
          dlToSpan(rec.attrs.usageLoc as Rec),
        ];
      })
    )
  );
}

function replaceAtSpans(code: string, spans: Span[], newText: string): string {
  return spans.reduceRight(
    (curCode, span) => replaceAtSpan(curCode, span, newText),
    code
  );
}

function textAtSpan(source: string, span: Span): string {
  return source.slice(span.from, span.to);
}

// exported for testing
export function getNewSpans(spans: Span[], newTextLength: number): Span[] {
  const diff = newTextLength - spanLength(spans[0]);
  return spans.reduce(
    ({ newList, offset }, span) => ({
      newList: [
        ...newList,
        { from: span.from + offset, to: span.to + offset + diff },
      ],
      offset: offset + diff,
    }),
    { newList: [], offset: 0 }
  ).newList;
}
