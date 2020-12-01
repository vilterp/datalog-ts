import { Span, dlToSpan } from "./types";
import { Interpreter, queryStr } from "../../incremental/interpreter";
import { Rec, Int } from "../../types";

export function replaceAtSpan(source: string, span: Span, newText: string) {
  return source.substring(0, span.from) + newText + source.substring(span.to);
}

export function getCursor(interp: Interpreter): number {
  const results = queryStr(interp, "ide.Cursor{idx: Idx}");
  if (results.length === 0) {
    return 0;
  }
  return ((results[0].term as Rec).attrs.idx as Int).val;
}

export function spanContainsIdx(span: Span, cursor: number): boolean {
  return span.from <= cursor && cursor <= span.to;
}

export function spanLength(span: Span): number {
  return span.to - span.from;
}

export function sortSpans(spans: Span[]): Span[] {
  return spans.sort((a, b) => a.from - b.from);
}

export function getCurrentPlaceholder(interp: Interpreter): Span | null {
  const results = queryStr(interp, "ide.CurrentPlaceholder{span: S}");
  if (results.length === 0) {
    return null;
  }
  const currentPlaceholder = results[0].term as Rec;
  return dlToSpan(currentPlaceholder.attrs.span as Rec);
}

export function getPlaceholders(interp: Interpreter): Span[] {
  return sortSpans(
    queryStr(interp, "ast.Placeholder{location: S}").map((res) =>
      dlToSpan((res.term as Rec).attrs.location as Rec)
    )
  );
}
