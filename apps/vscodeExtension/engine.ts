import * as vscode from "vscode";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { constructInterp } from "../../languageWorkbench/interp";
import { LANGUAGES, LanguageSpec } from "../../languageWorkbench/languages";
import { LOADER, mainDL } from "../../languageWorkbench/common";
import { Rec, Res, StringLit } from "../../core/types";
import { dlToSpan } from "../../uiCommon/ide/types";
import { ppt } from "../../core/pretty";
import {
  idxFromLineAndCol,
  lineAndColFromIdx,
} from "../../util/indexToLineCol";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { spanToRange } from "./util";

export function getDefinition(
  doc: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Definition> {
  const source = doc.getText();
  const interp = getInterp(LANGUAGES.datalog, source);
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const results = interp.queryStr(`ide.DefnAtPos{idx: ${idx}, defnSpan: US}`);
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  const location = new vscode.Location(
    doc.uri,
    spanToRange(source, result.attrs.defnSpan as Rec)
  );
  return location;
}

export function getReferences(
  doc: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.ReferenceContext,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Location[]> {
  const source = doc.getText();
  const interp = getInterp(LANGUAGES.datalog, source);
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const results = interp.queryStr(`ide.UsageAtPos{idx: ${idx}, usageSpan: US}`);
  return results.map(
    (res) =>
      new vscode.Location(
        doc.uri,
        spanToRange(source, (res.term as Rec).attrs.usageSpan as Rec)
      )
  );
}

const HIGHLIGHT_KINDS = {
  defn: vscode.DocumentHighlightKind.Write,
  usage: vscode.DocumentHighlightKind.Read,
};

export function getHighlights(
  doc: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.DocumentHighlight[]> {
  const source = doc.getText();
  const interp = getInterp(LANGUAGES.datalog, source);
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.CurrentUsageOrDefn{span: S, type: T}`);
  return results.map((res) => {
    const result = res.term as Rec;
    const kind = result.attrs.type as StringLit;
    const range = spanToRange(source, result.attrs.span as Rec);
    return new vscode.DocumentHighlight(range, HIGHLIGHT_KINDS[kind.val]);
  });
}

export function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
) {
  const source = doc.getText();
  const interp = getInterp(LANGUAGES.datalog, source);

  const problems = interp.queryStr("tc.Problem{}");
  const diags = problems.map((res) =>
    problemToDiagnostic(source, res.term as Rec)
  );
  diagnostics.set(doc.uri, diags);
}

function problemToDiagnostic(source: string, rec: Rec): vscode.Diagnostic {
  const span = dlToSpan(rec.attrs.span as Rec);
  const from = lineAndColFromIdx(source, span.from);
  const to = lineAndColFromIdx(source, span.to);

  const range = new vscode.Range(from.line, from.col, to.line, to.col);
  return new vscode.Diagnostic(range, ppt(rec.attrs.desc));
}

function getInterp(
  language: LanguageSpec,
  source: string
): AbstractInterpreter {
  const { finalInterp } = constructInterp({
    initInterp: new SimpleInterpreter(".", LOADER),
    builtinSource: mainDL,
    dlSource: language.datalog,
    grammarSource: language.grammar,
    langSource: source,
  });
  return finalInterp;
}
