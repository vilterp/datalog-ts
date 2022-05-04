// TODO: I swear I've written this before...

export type LineAndCol = { line: number; col: number };

export function lineAndColFromIdx(source: string, index: number): LineAndCol {
  const lines = source.split("\n");
  let lineStartidx = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (lineStartidx + line.length > index) {
      return { line: lineIdx + 1, col: index - lineStartidx + 1 };
    }
    lineStartidx += line.length;
  }
  throw new Error(`not found: index ${index}`);
}
