import React from "react";
import classnames from "classnames";
import { ReplCore } from "../../replCore";
import { Rec, Int, StringLit, Bool, Term } from "../../types";
import { uniqBy } from "../../util";

export type Span = { from: number; to: number };

export function highlight(
  repl: ReplCore,
  code: string,
  syntaxErrorIdx: number | null
): React.ReactNode {
  if (syntaxErrorIdx) {
    return highlightSyntaxError(code, syntaxErrorIdx);
  }
  const segments = repl.evalStr("segment{type: T, span: S, highlight: H}.");
  const sortedSegments = hlWins(
    uniqBy(
      segments.results
        .map((res) => mkRawSegment(res.term as Rec))
        .sort((a, b) => getStartOffset(a) - getStartOffset(b)),
      (rs) => `${spanToString(rs.span)}-${rs.highlighted}`
    )
  );
  const inOrder = assembleInOrder(code, sortedSegments);
  return inOrder.map((s, idx) => (
    <React.Fragment key={idx}>{renderSegment(s)}</React.Fragment>
  ));
}

function highlightSyntaxError(code: string, idx: number): React.ReactNode {
  if (idx === code.length) {
    return (
      <>
        {code}
        <span className="segment-syntax-error">&nbsp;</span>
      </>
    ); // not sure what to highlight at EOF
  }
  return [
    <React.Fragment key="before">{code.substring(0, idx)}</React.Fragment>,
    <span key="err" className="segment-syntax-error">
      {code.substr(idx, 1)}
    </span>,
    <React.Fragment key="after">{code.substring(idx + 1)}</React.Fragment>,
  ];
}

function getStartOffset(t: RawSegment): number {
  return t.span.from;
}

function mkRawSegment(rec: Rec): RawSegment {
  return {
    highlighted: (rec.attrs.highlight as Bool).val,
    span: dlToSpan(rec.attrs.span as Rec),
    type: (rec.attrs.type as StringLit).val,
  };
}

function renderSegment(segment: Segment): React.ReactNode {
  switch (segment.type) {
    case "normal":
      return segment.text;
    default:
      return (
        <span
          className={classnames(`segment-${segment.type}`, {
            [`segment-${segment.type}__highlighted`]: segment.highlighted,
          })}
        >
          {segment.text}
        </span>
      );
  }
}

type RawSegment = { type: string; highlighted: boolean; span: Span };

type Segment = { type: string; highlighted: boolean; text: string };

function assembleInOrder(src: string, rawSegments: RawSegment[]): Segment[] {
  return recurse(src, 0, rawSegments);
}

function recurse(src: string, offset: number, spans: RawSegment[]): Segment[] {
  if (spans.length === 0) {
    return [
      { type: "normal", highlighted: false, text: src.substring(offset) },
    ];
  }
  const firstSpan = spans[0];
  const fromIdx = firstSpan.span.from;
  const toIdx = firstSpan.span.to;
  if (offset === fromIdx) {
    const outSpan: Segment = {
      type: firstSpan.type,
      text: src.substring(offset, toIdx),
      highlighted: firstSpan.highlighted,
    };
    return [outSpan, ...recurse(src, toIdx, spans.slice(1))];
  } else {
    return [
      {
        type: "normal",
        highlighted: false,
        text: src.substring(offset, fromIdx),
      },
      ...recurse(src, fromIdx, spans),
    ];
  }
}

// helpers

export function dlToSpan(rec: Rec): Span {
  return {
    from: dlToPos(rec.attrs.from),
    to: dlToPos(rec.attrs.to),
  };
}

function dlToPos(term: Term): number {
  return (term as Int).val;
}

function hlWins(segments: RawSegment[]): RawSegment[] {
  if (segments.length === 0) {
    return [];
  }
  if (segments.length === 1) {
    return segments;
  }
  const first = segments[0];
  const second = segments[1];

  if (spanToString(first.span) === spanToString(second.span)) {
    if (first.type !== second.type) {
      throw new Error("same span should imply same type");
    }
    const chosen = first.highlighted ? first : second;
    return [chosen, ...hlWins(segments.slice(2))];
  }
  return [first, ...hlWins(segments.slice(1))];
}

function spanToString(span: Span): string {
  return `${span.from}-${span.to}`;
}
