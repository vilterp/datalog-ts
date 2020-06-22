import { ReplCore } from "../../replCore";
import { Span, Pos } from "../parser";
import { Rec, Int } from "../../types";

export function highlight(
  repl: ReplCore,
  code: string,
  cursor: number
): string {
  const segmented = highlightSegments(repl, code, cursor);
  return segmented
    .map((segment) => {
      switch (segment.type) {
        case "normal":
          return segment.text;
        default:
          return `<span class="segment-${segment.type}">${segment.text}</span>`;
      }
    })
    .join("");
}

export function highlightSegments(
  repl: ReplCore,
  code: string,
  cursor: number
) {
  const usageInfo = getDefnAndUsages(repl, cursor);
  console.log(usageInfo);
  return segment(code, usageInfo);
}

type SpanType = "defn" | "usage" | "normal";

type UsageInfo = { defn: Span | null; usages: Span[] };

type OutputSpan = { type: SpanType; text: string };

type UsageSpan = { type: SpanType; span: Span };

function segment(src: string, usageInfo: UsageInfo): OutputSpan[] {
  const defnSpan: UsageSpan[] =
    usageInfo.defn === null ? [] : [{ type: "defn", span: usageInfo.defn }];
  const usageSpans: UsageSpan[] = usageInfo.usages.map((span) => ({
    type: "usage",
    span,
  }));
  const allSpans: UsageSpan[] = [...usageSpans, ...defnSpan].sort(
    (a, b) => a.span.from.offset - b.span.from.offset
  );
  return recurse(src, 0, allSpans);
}

function recurse(
  src: string,
  offset: number,
  spans: UsageSpan[]
): OutputSpan[] {
  if (spans.length === 0) {
    return [];
  }
  const toIdx = spans[0].span.to.offset;
  const outSpan: OutputSpan = {
    type: spans[0].type,
    text: src.substr(offset, toIdx),
  };
  return [outSpan, ...recurse(src, toIdx, spans.slice(1))];
}

function getDefnAndUsages(repl: ReplCore, cursor: number): UsageInfo {
  const defnLoc = getDefnLoc(repl, cursor);
  const usageLocs = defnLoc === null ? [] : getUsageLocs(repl, defnLoc);
  console.log({ defnLoc });
  return {
    defn: defnLoc,
    usages: usageLocs,
  };
}

function getDefnLoc(repl: ReplCore, cursor: number): Span | null {
  const usages = repl.evalStr(
    `usage{
      usageLoc: span{from: pos{idx: ${cursor}}},
      definitionLoc: span{from: pos{idx: DF}, to: pos{idx: DT}}
    }.`
  ).results;
  if (usages.length > 0) {
    // we're on a usage
    return dlToSpan((usages[0].term as Rec).attrs.definitionLoc as Rec);
  }
  const defn = repl.evalStr(
    `usage{definitionLoc: span{from: pos{idx: ${cursor}}, to: pos{idx: T}}}.`
  ).results;
  if (defn.length > 0) {
    // we're on a defn
    return dlToSpan((defn[0].term as Rec).attrs.definitionLoc as Rec);
  }
  return null;
}

function getUsageLocs(repl: ReplCore, defnLoc: Span): Span[] {
  const query = `usage{
    definitionLoc: span{from: pos{idx: ${defnLoc.from.offset}}, to: pos{idx: ${defnLoc.to.offset}}},
    usageLoc: span{from: pos{idx: UF}, to: pos{idx: UT}}
  }.`;
  console.log("getUsageLocs", { defnLoc, query });
  const usages = repl.evalStr(query).results;

  console.log("usage locs:", usages);
  return usages.map((result) =>
    dlToSpan((result.term as Rec).attrs.usageLoc as Rec)
  );
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
