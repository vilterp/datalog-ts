import React from "react";
import classnames from "classnames";
import { ReplCore } from "../../replCore";
import { Rec, Int, Term, StringLit, Bool } from "../../types";
import { Pos, Span } from "../parser";

export function highlight(repl: ReplCore, code: string): React.ReactNode {
  const segments = repl.evalStr("segment{type: T, span: S, highlight: H}.");
  const sortedSegments = segments.results
    .map((res) => mkRawSegment(res.term as Rec))
    .sort((a, b) => getStartOffset(a) - getStartOffset(b));
  const inOrder = assembleInOrder(code, sortedSegments);
  return inOrder.map((s, idx) => (
    <React.Fragment key={idx}>{renderSegment(s)}</React.Fragment>
  ));
}

function getStartOffset(t: RawSegment): number {
  return t.span.from.offset;
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
  const fromIdx = firstSpan.span.from.offset;
  const toIdx = firstSpan.span.to.offset;
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
