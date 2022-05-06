import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { rec, Rec, StringLit } from "../../core/types";
import { LOADER, mainDL } from "../commonDL";
import { constructInterp } from "../interp";
import { LanguageSpec } from "../languages";
import {
  dlToSpan,
  idxFromLineAndCol,
  lineAndColFromIdx,
} from "../sourcePositions";
import {
  CancellationToken,
  Definition,
  Position,
  ProviderResult,
  TextDocument,
  Location,
} from "./types";
import { spanToRange } from "./util";

export function getDefinition(
  spec: LanguageSpec,
  document: TextDocument,
  position: Position,
  token: CancellationToken
): ProviderResult<Definition> {
  const source = document.getText();
  const interp = getInterp(spec, source);
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const results = interp.queryStr(`ide.DefnAtPos{idx: ${idx}, defnSpan: US}`);
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  const location = new Location(
    document.uri,
    spanToRange(source, result.attrs.defnSpan as Rec)
  );
  return location;
}

export function getReferences(
  spec: LanguageSpec,
  document: TextDocument,
  position: Position,
  context: ReferenceContext,
  token: CancellationToken
): ProviderResult<Location[]> {
  const source = document.getText();
  const interp = getInterp(spec, source);
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const results = interp.queryStr(`ide.UsageAtPos{idx: ${idx}, usageSpan: US}`);
  return results.map(
    (res) =>
      new Location(
        document.uri,
        spanToRange(source, (res.term as Rec).attrs.usageSpan as Rec)
      )
  );
}

const HIGHLIGHT_KINDS = {
  defn: DocumentHighlightKind.Write,
  usage: DocumentHighlightKind.Read,
};

export function getHighlights(
  spec: LanguageSpec,
  document: TextDocument,
  position: Position,
  token: CancellationToken
): ProviderResult<DocumentHighlight[]> {
  const source = document.getText();
  const interp = getInterp(spec, source);
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
    return new DocumentHighlight(range, HIGHLIGHT_KINDS[kind.val]);
  });
}

export function getCompletionItems(
  spec: LanguageSpec,
  document: TextDocument,
  position: Position,
  token: CancellationToken,
  context: CompletionContext
): ProviderResult<CompletionItem[]> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const sourceWithPlaceholder =
    source.slice(0, idx) + "???" + source.slice(idx);
  const interp = getInterp(spec, sourceWithPlaceholder);
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
  spec: LanguageSpec,
  document: TextDocument,
  position: Position,
  newName: string,
  token: CancellationToken
): ProviderResult<WorkspaceEdit> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const interp = getInterp(spec, source);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.RenameSpan{name: N, span: S}`);

  const edit = new WorkspaceEdit();
  results.forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    edit.replace(document.uri, range, newName);
  });
  return edit;
}

export function prepareRename(
  spec: LanguageSpec,
  document: TextDocument,
  position: Position
): ProviderResult<Range> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const interp = getInterp(spec, source);
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
  spec: LanguageSpec,
  document: TextDocument,
  token: CancellationToken
): ProviderResult<SymbolInformation[] | DocumentSymbol[]> {
  const source = document.getText();
  const interp = getInterp(spec, source);

  const results = interp.queryStr(
    `scope.Defn{scopeID: ${ppt(GLOBAL_SCOPE)}, name: N, span: S, kind: K}`
  );

  return results.map((res) => {
    const rec = res.term as Rec;
    const name = (rec.attrs.name as StringLit).val;
    const range = spanToRange(source, rec.attrs.span as Rec);
    return new SymbolInformation(
      name,
      SymbolKind.Function,
      "",
      new Location(document.uri, range)
    );
  });
}

export function getSemanticTokens(
  spec: LanguageSpec,
  document: TextDocument,
  token: CancellationToken
): ProviderResult<SemanticTokens> {
  const source = document.getText();
  const interp = getInterp(spec, source);
  const results = interp.queryStr("hl.NonHighlightSegment{}");

  const builder = new SemanticTokensBuilder(semanticTokensLegend);
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
export const semanticTokensLegend = new SemanticTokensLegend([
  "number",
  "string",
  "keyword",
  "comment",
  "variable",
  "typeParameter",
]);

export function refreshDiagnostics(
  spec: LanguageSpec,
  document: TextDocument,
  diagnostics: DiagnosticCollection
) {
  const source = document.getText();
  const interp = getInterp(spec, source);

  const problems = interp.queryStr("tc.Problem{}");
  const diags = problems.map((res) =>
    problemToDiagnostic(source, res.term as Rec)
  );
  diagnostics.set(document.uri, diags);
}

function problemToDiagnostic(source: string, rec: Rec): Diagnostic {
  const span = dlToSpan(rec.attrs.span as Rec);
  const from = lineAndColFromIdx(source, span.from);
  const to = lineAndColFromIdx(source, span.to);

  const range = new Range(from.line, from.col, to.line, to.col);
  return new Diagnostic(range, ppt(rec.attrs.desc));
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
