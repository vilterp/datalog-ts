import React from "react";
import classnames from "classnames";
import { Interpreter, queryStr } from "../../incremental/interpreter";
import { Rec, StringLit, Bool } from "../../types";
import { uniqBy } from "../../util";
import { dlToSpan, Span } from "./types";
import { DLTypeError } from "./errors";

export function highlight(
  interp: Interpreter,
  code: string,
  syntaxErrorIdx: number | null,
  typeErrors: DLTypeError[]
): React.ReactNode {
  if (syntaxErrorIdx) {
    return highlightSyntaxError(code, syntaxErrorIdx);
  }
  const segments = queryStr(
    interp,
    "hl.Segment{type: T, span: S, highlight: H}"
  );
  const sortedSegments = hlWins(
    uniqBy(
      segments
        .map((res) => mkRawSegment(res.term as Rec))
        .sort((a, b) => getStartOffset(a) - getStartOffset(b)),
      (rs) => `${spanToString(rs.span)}-${rs.state.highlight}`
    )
  );
  const inOrder = intersperseTextSegments(code, sortedSegments, typeErrors);
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

function getStartOffset(t: SegmentSpan): number {
  return t.span.from;
}

function mkRawSegment(rec: Rec): SegmentSpan {
  return {
    state: {
      highlight: (rec.attrs.highlight as Bool).val,
      error: false,
    },
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
            [`segment-${segment.type}__highlighted`]: segment.state.highlight,
            "segment-type-error": segment.state.error,
          })}
        >
          {segment.text}
        </span>
      );
  }
}

type SegmentState = { highlight: boolean; error: boolean };

type SegmentAttrs = {
  type: string | null;
  state: SegmentState;
};

type SegmentSpan = SegmentAttrs & { span: Span };

type Segment = SegmentAttrs & { text: string };

function intersperseTextSegments(
  src: string,
  rawSegments: SegmentSpan[],
  typeErrors: DLTypeError[]
): Segment[] {
  return recurse(src, 0, rawSegments, typeErrors);
}

// TODO: this treatment of type errors is hacky
function recurse(
  src: string,
  offset: number,
  spans: SegmentSpan[],
  typeErrors: DLTypeError[]
): Segment[] {
  if (spans.length === 0) {
    return [
      {
        type: null,
        state: { highlight: false, error: false },
        text: src.substring(offset),
      },
    ];
  }
  const firstSpan = spans[0];
  const fromIdx = firstSpan.span.from;
  const toIdx = firstSpan.span.to;
  if (offset === fromIdx) {
    const matchingTypeError =
      typeErrors[0] && typeErrors[0].span.from === offset;
    const outSpan: Segment = {
      type: firstSpan.type,
      text: src.substring(offset, toIdx),
      state: { ...firstSpan.state, error: matchingTypeError },
    };
    return [
      outSpan,
      ...recurse(
        src,
        toIdx,
        spans.slice(1),
        matchingTypeError ? typeErrors.slice(1) : typeErrors
      ),
    ];
  } else {
    return [
      {
        type: null,
        state: { highlight: false, error: false },
        text: src.substring(offset, fromIdx),
      },
      ...recurse(src, fromIdx, spans, typeErrors),
    ];
  }
}

function hlWins(segments: SegmentSpan[]): SegmentSpan[] {
  if (segments.length === 0) {
    return [];
  }
  if (segments.length === 1) {
    return segments;
  }
  const first = segments[0];
  const second = segments[1];

  if (spanToString(first.span) === spanToString(second.span)) {
    // if (first.type !== second.type) {
    //   throw new Error("same span should imply same type");
    // }
    const chosen = first.state.highlight ? first : second;
    return [chosen, ...hlWins(segments.slice(2))];
  }
  return [first, ...hlWins(segments.slice(1))];
}

function spanToString(span: Span): string {
  return `${span.from}-${span.to}`;
}
