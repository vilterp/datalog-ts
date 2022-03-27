import React from "react";
import classnames from "classnames";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit, Bool, Int, Res } from "../../core/types";
import { uniqBy } from "../../util/util";
import { dlToSpan, Span } from "./types";
import { DLTypeError as DLMissingType } from "./errors";

export function highlight(
  interp: AbstractInterpreter,
  code: string,
  syntaxErrorIdx: number | null,
  missingTypes: DLMissingType[],
  lang: string
): React.ReactNode {
  if (syntaxErrorIdx) {
    return highlightSyntaxError(code, syntaxErrorIdx);
  }
  performance.mark("highlight start");
  const segments = interp.queryStr(
    "hl.Segment{type: T, span: S, id: I, highlight: H}"
  );
  const problems = interp.queryStr("tc.Problem{desc: D, nodeID: I}");
  performance.mark("highlight end");
  performance.measure(`highlight ${lang}`, "highlight start", "highlight end");
  const sortedSegments = hlWins(
    uniqBy(
      segments
        .filter((res) => (res.term as Rec).attrs.span.type === "Record") // filter out "builtin", etc
        .map((res) => mkRawSegment(res.term as Rec))
        .sort((a, b) => getStartOffset(a) - getStartOffset(b)),
      (rs) => `${spanToString(rs.span)}-${rs.state.highlight}`
    )
  );
  const inOrder = intersperseTextSegments(
    code,
    sortedSegments,
    missingTypesByID(missingTypes),
    problemsByID(problems)
  );
  return inOrder.map((s, idx) => (
    <React.Fragment key={idx}>{renderSegment(s)}</React.Fragment>
  ));
}

type ProblemsByID = { [id: string]: Rec };

function problemsByID(problems: Res[]): ProblemsByID {
  const out: ProblemsByID = {};
  for (const problem of problems) {
    const rec = problem.term as Rec;
    const nodeID = (rec.attrs.nodeID as Int).val;
    out[nodeID] = rec;
  }
  return out;
}

type MissingTypesByID = { [id: string]: DLMissingType };

function missingTypesByID(items: DLMissingType[]) {
  const out: MissingTypesByID = {};
  for (const item of items) {
    out[item.nodeID] = item;
  }
  return out;
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
    nodeID: (rec.attrs.id as Int).val,
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
  nodeID: number | null; // id in the AST
  type: string | null;
  state: SegmentState;
};

type SegmentSpan = SegmentAttrs & { span: Span };

type Segment = SegmentAttrs & { text: string };

function intersperseTextSegments(
  src: string,
  rawSegments: SegmentSpan[],
  missingTypesByID: MissingTypesByID,
  problems: ProblemsByID
): Segment[] {
  console.log("intersperseTextSegments", { problems, rawSegments });
  return recurse(src, 0, rawSegments, missingTypesByID, problems);
}

// TODO: this treatment of type errors is hacky
function recurse(
  src: string,
  offset: number,
  spans: SegmentSpan[],
  missingTypesByID: MissingTypesByID,
  problemsByID: ProblemsByID
): Segment[] {
  if (spans.length === 0) {
    return [
      {
        type: null,
        nodeID: null,
        state: { highlight: false, error: false },
        text: src.substring(offset),
      },
    ];
  }
  const firstSpan = spans[0];
  const fromIdx = firstSpan.span.from;
  const toIdx = firstSpan.span.to;
  const nodeIDForSpan = firstSpan.nodeID;
  console.log("recurse", {
    firstSpan,
    offset,
    fromIdx,
    nodeIDForSpan,
    problemsByID,
  });
  if (offset === fromIdx) {
    const matchingMissingType = missingTypesByID[nodeIDForSpan];
    const matchingProblem = problemsByID[nodeIDForSpan];
    if (Object.keys(problemsByID).length > 1) {
      console.log({ problemsByID, matchingProblem, nodeIDForSpan });
    }
    const outSpan: Segment = {
      type: firstSpan.type,
      nodeID: nodeIDForSpan,
      text: src.substring(offset, toIdx),
      state: {
        ...firstSpan.state,
        error: !!matchingMissingType || !!matchingProblem,
      },
    };
    return [
      outSpan,
      ...recurse(src, toIdx, spans.slice(1), missingTypesByID, problemsByID),
    ];
  } else {
    return [
      {
        type: null,
        nodeID: null,
        state: { highlight: false, error: false },
        text: src.substring(offset, fromIdx),
      },
      ...recurse(src, fromIdx, spans, missingTypesByID, problemsByID),
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
    // TODO: not sure this warning is worth it
    // if (first.type !== second.type) {
    //   console.warn("same span should imply same type", first, second);
    // }
    const chosen = first.state.highlight ? first : second;
    return [chosen, ...hlWins(segments.slice(2))];
  }
  return [first, ...hlWins(segments.slice(1))];
}

function spanToString(span: Span): string {
  return `${span.from}-${span.to}`;
}
