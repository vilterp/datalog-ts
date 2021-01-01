import {
  EditorAction,
  ActionContext,
  EditorState,
  Span,
  dlToSpan,
} from "./types";
import {
  replaceAtSpan,
  getCursor,
  spanContainsIdx,
  spanLength,
  sortSpans,
} from "./util";
import { Interpreter } from "../../incremental/interpreter";
import { flatMap, uniqBy } from "../../util/util";
import { Rec } from "../../types";

export const renameRefactorAction: EditorAction = {
  name: "Rename",
  available(ctx: ActionContext): boolean {
    return getSpansToReplace(ctx.interp) !== null;
  },
  apply(ctx: ActionContext): EditorState {
    const { defnSpan, allSpans } = getSpansToReplace(ctx.interp);
    const currentName = ctx.state.source.slice(defnSpan.from, defnSpan.to);
    const newText = window.prompt("new name", currentName); // TODO: do this inline or something. lol
    const cursor = getCursor(ctx.interp);
    const cursorSpanIdx = allSpans.findIndex((span) =>
      spanContainsIdx(span, cursor)
    );
    const newSpans = getNewSpans(allSpans, newText.length);
    return {
      ...ctx.state,
      source: replaceAtSpans(ctx.state.source, allSpans, newText),
      cursorPos: newSpans[cursorSpanIdx].to,
    };
  },
};

function getSpansToReplace(
  interp: Interpreter
): { defnSpan: Span; allSpans: Span[] } | null {
  const results = interp.queryStr(
    "ide.RenameCandidate{defnLoc: DL, usageLoc: UL}"
  );
  if (results.length === 0) {
    return null;
  }
  return {
    defnSpan: dlToSpan((results[0].term as Rec).attrs.defnLoc as Rec),
    allSpans: sortSpans(
      uniqBy(
        flatMap(results, (res) => {
          const rec = res.term as Rec;
          return [
            dlToSpan(rec.attrs.defnLoc as Rec),
            dlToSpan(rec.attrs.usageLoc as Rec),
          ];
        }),
        (s) => `${s.from}`
      )
    ),
  };
}

function replaceAtSpans(code: string, spans: Span[], newText: string): string {
  return spans.reduceRight(
    (curCode, span) => replaceAtSpan(curCode, span, newText),
    code
  );
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
