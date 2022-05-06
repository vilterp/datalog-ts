import { Int, Rec, Term } from "../core/types";

export type LineAndCol = {
  line: number; // zero-indexed
  col: number; // zero-indexed
};

export type Span = { from: number; to: number };

export function dlToSpan(rec: Rec): Span {
  return {
    from: dlToPos(rec.attrs.from),
    to: dlToPos(rec.attrs.to),
  };
}

function dlToPos(term: Term): number {
  return (term as Int).val;
}

export function lineAndColFromIdx(source: string, index: number): LineAndCol {
  const lines = source.split("\n");
  let lineStartidx = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (lineStartidx + line.length >= index) {
      return { line: lineIdx, col: index - lineStartidx };
    }
    lineStartidx += line.length + 1; // +1 for the newline
  }
  console.error("lineAndColFromIdx: not found:", { source, index });
  throw new Error(`not found: index ${index}`);
}

export function idxFromLineAndCol(source: string, pos: LineAndCol): number {
  const lines = source.split("\n");
  let out = 0;
  for (let curLine = 0; curLine < pos.line; curLine++) {
    out += lines[curLine].length + 1; // +1 for newline
  }
  return out + pos.col;
}
