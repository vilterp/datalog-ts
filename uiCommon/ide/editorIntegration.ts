import * as vscode from "vscode";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { constructInterp } from "../../languageWorkbench/interp";
import { LANGUAGES, LanguageSpec } from "../../languageWorkbench/languages";
import { LOADER, mainDL } from "../../languageWorkbench/common";
import { rec, Rec, StringLit } from "../../core/types";
import { dlToSpan } from "./types";
import { ppt } from "../../core/pretty";
import {
  idxFromLineAndCol,
  lineAndColFromIdx,
} from "../../util/indexToLineCol";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { spanToRange } from "../../apps/vscodeExtension/util";

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

export function getCompletionItems(
  doc: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken,
  context: vscode.CompletionContext
): vscode.ProviderResult<vscode.CompletionItem[]> {
  const source = doc.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const sourceWithPlaceholder =
    source.slice(0, idx) + "???" + source.slice(idx);
  const interp = getInterp(LANGUAGES.datalog, sourceWithPlaceholder);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    `ide.CurrentSuggestion{name: N, span: S, type: T}`
  );
  return results.map((res) => {
    const result = res.term as Rec;
    const label = result.attrs.name as StringLit;
    const range = spanToRange(source, result.attrs.span as Rec);
    return {
      label: label.val,
    };
  });
}

export function getRenameEdits(
  document: vscode.TextDocument,
  position: vscode.Position,
  newName: string,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.WorkspaceEdit> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const interp = getInterp(LANGUAGES.datalog, source);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.RenameSpan{name: N, span: S}`);

  const edit = new vscode.WorkspaceEdit();
  results.forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    edit.replace(document.uri, range, newName);
  });
  return edit;
}

export function prepareRename(
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.ProviderResult<vscode.Range> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const interp = getInterp(LANGUAGES.datalog, source);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    "ide.CurrentDefnOrDefnOfCurrentVar{span: S}"
  );
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  return spanToRange(source, result.attrs.span as Rec);
}

// TODO: parameterize by language
const GLOBAL_SCOPE = rec("global", {});

export function getSymbolList(
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
  const source = document.getText();
  const interp = getInterp(LANGUAGES.datalog, source);

  const results = interp.queryStr(
    `scope.Defn{scopeID: ${ppt(GLOBAL_SCOPE)}, name: N, span: S, kind: K}`
  );

  return results.map((res) => {
    const rec = res.term as Rec;
    const name = (rec.attrs.name as StringLit).val;
    const range = spanToRange(source, rec.attrs.span as Rec);
    return new vscode.SymbolInformation(
      name,
      vscode.SymbolKind.Function,
      "",
      new vscode.Location(document.uri, range)
    );
  });
}

export function getSemanticTokens(
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.SemanticTokens> {
  const source = document.getText();
  const interp = getInterp(LANGUAGES.datalog, source);
  const results = interp.queryStr("hl.NonHighlightSegment{}");

  const builder = new vscode.SemanticTokensBuilder(semanticTokensLegend);
  results.forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    const typ = (result.attrs.type as StringLit).val;
    builder.push(range, typ);
  });
  return builder.build();
}

// needs to match https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-classification
// needs to match highlight.dl
export const semanticTokensLegend = new vscode.SemanticTokensLegend([
  "number",
  "string",
  "keyword",
  "comment",
  "variable",
  "typeParameter",
]);

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
