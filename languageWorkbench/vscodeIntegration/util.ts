import * as vscode from "vscode";
import { Rec } from "../../core/types";
import { dlToSpan, lineAndColFromIdx } from "../sourcePositions";

export function idxToPosition(source: string, idx: number): vscode.Position {
  const lineAndCol = lineAndColFromIdx(source, idx);
  return new vscode.Position(lineAndCol.line, lineAndCol.col);
}

export function spanToRange(source: string, dlSpan: Rec): vscode.Range {
  const span = dlToSpan(dlSpan);
  const from = idxToPosition(source, span.from);
  const to = idxToPosition(source, span.to);
  return new vscode.Range(from, to);
}
