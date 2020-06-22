import React from "react";
import classnames from "classnames";
import { ReplCore } from "../../replCore";
import { Span, Pos } from "../parser";
import { Rec, Int } from "../../types";
import { groupBy, pairsToObj, flatMap, uniq, uniqBy } from "../../util";

// TODO: the amount of roundtrips to strings in here is sickening

export function highlight(
  repl: ReplCore,
  code: string,
  cursor: number
): React.ReactNode {
  const segments = getSegments(repl, code, cursor);
  console.log(segments);
  return segments.map((s, idx) => (
    <React.Fragment key={idx}>{renderSegment(s)}</React.Fragment>
  ));
}

export function getSegments(
  repl: ReplCore,
  code: string,
  cursor: number
): Segment[] {
  const indexes = getUsageIndexes(repl);
  return segment(code, indexes, cursor);
}

function renderSegment(segment: Segment): React.ReactNode {
  switch (segment.type.type) {
    case "normal":
      return segment.text;
    case "defn":
      return (
        <span
          className={classnames("segment-defn", {
            "segment-defn__unused": !segment.type.used,
            "segment-defn__highlighted": segment.type.highlighted,
          })}
        >
          {segment.text}
        </span>
      );
    case "usage":
      return (
        <span
          className={classnames("segment-usage", {
            "segment-usage__highlighted": segment.type.highlighted,
          })}
        >
          {segment.text}
        </span>
      );
  }
}

type SegmentType =
  | { type: "defn"; used: boolean; highlighted: boolean }
  | { type: "usage"; highlighted: boolean }
  | { type: "normal" };

type Segment = { type: SegmentType; text: string };

type InnerSegment = { type: SegmentType; span: Span };

type SpanWithType = { type: "defn" | "usage"; span: Span };

function segment(
  src: string,
  indexes: UsageIndexes,
  cursor: number
): Segment[] {
  const highlighted = getHighlighted(indexes, cursor);
  const allSpans: InnerSegment[] = indexes.byStartIdx.map(
    (spanWT): InnerSegment => {
      switch (spanWT.type) {
        case "usage":
          return {
            type: {
              type: "usage",
              highlighted: !!highlighted.usages.find(
                (s) => spanToString(s) === spanToString(spanWT.span)
              ),
            },
            span: spanWT.span,
          };
        case "defn":
          return {
            type: {
              type: "defn",
              used:
                (indexes.byDefn[spanToString(spanWT.span)] || []).length > 0,
              highlighted: highlighted.defn === spanToString(spanWT.span),
            },
            span: spanWT.span,
          };
      }
    }
  );
  return recurse(src, 0, allSpans);
}

type Highlighted = { defn: string | undefined; usages: Span[] };

function getHighlighted(indexes: UsageIndexes, cursor: number): Highlighted {
  // we're on a defn
  const defnSpanStr = Object.keys(indexes.byDefn).find((spanStr) =>
    idxInSpan(cursor, spanFromString(spanStr))
  );
  if (defnSpanStr) {
    return {
      defn: defnSpanStr,
      usages: indexes.byDefn[defnSpanStr],
    };
  }
  const usageSpanStr = Object.keys(indexes.byUsage).find((spanStr) =>
    idxInSpan(cursor, spanFromString(spanStr))
  );
  if (usageSpanStr) {
    const usageDefnSpanStr = spanToString(indexes.byUsage[usageSpanStr]);
    return { defn: usageDefnSpanStr, usages: indexes.byDefn[usageDefnSpanStr] };
  }
  return { defn: undefined, usages: [] };
}

function recurse(
  src: string,
  offset: number,
  spans: InnerSegment[]
): Segment[] {
  if (spans.length === 0) {
    return [{ type: { type: "normal" }, text: src.substring(offset) }];
  }
  const firstSpan = spans[0];
  const fromIdx = firstSpan.span.from.offset;
  const toIdx = firstSpan.span.to.offset;
  if (offset === fromIdx) {
    const outSpan: Segment = {
      type: firstSpan.type,
      text: src.substring(offset, toIdx),
    };
    return [outSpan, ...recurse(src, toIdx, spans.slice(1))];
  } else {
    return [
      { type: { type: "normal" }, text: src.substring(offset, fromIdx) },
      ...recurse(src, fromIdx, spans),
    ];
  }
}

// spans are `${fromIdx}-${toIdx}`
type UsageIndexes = {
  byDefn: { [span: string]: Span[] };
  byUsage: { [span: string]: Span };
  byStartIdx: { span: Span; type: "defn" | "usage" }[];
};

function getUsageIndexes(repl: ReplCore): UsageIndexes {
  const rawUsages = repl.evalStr(`usage{
      definitionLoc: span{from: pos{idx: DF}, to: pos{id: DT}},
      usageLoc: span{from: pos{idx: UF}, to: pos{id: UT}}
    }.`).results;
  const usages = rawUsages.map((usage) => ({
    defnSpan: dlToSpan((usage.term as Rec).attrs.definitionLoc as Rec),
    usageSpan: dlToSpan((usage.term as Rec).attrs.usageLoc as Rec),
  }));
  return {
    byDefn: groupBy(
      usages.map(({ defnSpan, usageSpan }) => [
        `${defnSpan.from.offset}-${defnSpan.to.offset}`,
        usageSpan,
      ])
    ),
    byUsage: pairsToObj(
      usages.map(({ defnSpan, usageSpan }) => ({
        key: `${usageSpan.from.offset}-${usageSpan.to.offset}`,
        val: defnSpan,
      }))
    ),
    byStartIdx: uniqBy(
      flatMap(usages, ({ defnSpan, usageSpan }): SpanWithType[] => [
        { type: "defn", span: defnSpan },
        { type: "usage", span: usageSpan },
      ]),
      (seg) => spanToString(seg.span)
    ).sort((a, b) => a.span.from.offset - b.span.from.offset),
  };
}

function dlToSpan(rec: Rec): Span {
  return {
    from: dlToPos(rec.attrs.from as Rec),
    to: dlToPos(rec.attrs.to as Rec),
  };
}

// TODO: just have pos's be ints already so we don't have to
// fake line and column
function dlToPos(rec: Rec): Pos {
  return { offset: (rec.attrs.idx as Int).val, line: 0, column: 0 };
}

// TODO: this is dumb, use maps

function spanToString(span: Span): string {
  return `${span.from.offset}-${span.to.offset}`;
}

function spanFromString(str: string): Span {
  const [from, to] = str.split("-");
  return {
    from: { offset: parseInt(from), line: 0, column: 0 },
    to: { offset: parseInt(to), line: 0, column: 0 },
  };
}

function idxInSpan(idx: number, span: Span): boolean {
  return span.from.offset <= idx && idx <= span.to.offset;
}
