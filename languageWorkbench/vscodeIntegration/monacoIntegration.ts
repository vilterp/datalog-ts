import * as monaco from "monaco-editor";
import { LanguageSpec } from "../languages";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { rec, Rec, StringLit } from "../../core/types";
import { LOADER, mainDL } from "../commonDL";
import { constructInterp } from "../interp";
import {
  dlToSpan,
  idxFromLineAndCol,
  lineAndColFromIdx,
} from "../sourcePositions";
import { ppt } from "../../core/pretty";

export function registerLanguageSupport(
  spec: LanguageSpec
): monaco.IDisposable[] {
  const subscriptions: monaco.IDisposable[] = [];

  // go to defn
  subscriptions.push(
    monaco.languages.registerDefinitionProvider(spec.name, {
      provideDefinition(
        document: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.Definition> {
        try {
          return getDefinition(spec, document, position, token);
        } catch (e) {
          console.error("in definition provider:", e);
        }
      },
    })
  );

  // references
  subscriptions.push(
    monaco.languages.registerReferenceProvider(spec.name, {
      provideReferences(
        document: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.ReferenceContext,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.Location[]> {
        try {
          return getReferences(spec, document, position, context, token);
        } catch (e) {
          console.error("in reference provider:", e);
        }
      },
    })
  );

  // highlight
  subscriptions.push(
    monaco.languages.registerDocumentHighlightProvider(spec.name, {
      provideDocumentHighlights(
        document: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.DocumentHighlight[]> {
        try {
          return getHighlights(spec, document, position, token);
        } catch (e) {
          console.error("in highlight provider:", e);
        }
      },
    })
  );

  // completions
  subscriptions.push(
    monaco.languages.registerCompletionItemProvider(spec.name, {
      provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
        try {
          return getCompletionItems(spec, document, position, token, context);
        } catch (e) {
          console.error("in completion provider:", e);
        }
      },
    })
  );

  // renames
  subscriptions.push(
    monaco.languages.registerRenameProvider(spec.name, {
      provideRenameEdits(
        document: monaco.editor.ITextModel,
        position: monaco.Position,
        newName: string,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.WorkspaceEdit> {
        try {
          return getRenameEdits(spec, document, position, newName, token);
        } catch (e) {
          console.error("in rename provider:", e);
        }
      },
      resolveRenameLocation(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.RenameLocation> {
        try {
          return prepareRename(spec, model, position);
        } catch (e) {
          console.error("in prepare rename:", e);
        }
      },
    })
  );

  // symbols
  subscriptions.push(
    monaco.languages.registerDocumentSymbolProvider(spec.name, {
      provideDocumentSymbols(
        document: monaco.editor.ITextModel,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.DocumentSymbol[]> {
        try {
          return getSymbolList(spec, document, token);
        } catch (e) {
          console.error("in symbol provider:", e);
        }
      },
    })
  );

  // syntax highlighting
  subscriptions.push(
    monaco.languages.registerDocumentSemanticTokensProvider(
      spec.name,
      {
        provideDocumentSemanticTokens(
          document: monaco.editor.ITextModel,
          token: monaco.CancellationToken
        ): monaco.languages.ProviderResult<monaco.SemanticTokens> {
          try {
            const before = new Date().getTime();
            const tokens = getSemanticTokens(spec, document, token);
            const after = new Date().getTime();
            console.log("datalog: getSemanticTokens:", after - before, "ms");
            return tokens;
          } catch (e) {
            console.error("in token provider:", e);
          }
        },
      },
      semanticTokensLegend
    )
  );

  return subscriptions;
}

export function getDefinition(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.Definition> {
  const source = document.getValue();
  const interp = getInterp(spec, source);
  const idx = idxFromLineAndCol(source, {
    line: position.lineNumber,
    col: position.column,
  });
  const results = interp.queryStr(`ide.DefnAtPos{idx: ${idx}, defnSpan: US}`);
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  const location = new monaco.Location(
    document.uri,
    spanToRange(source, result.attrs.defnSpan as Rec)
  );
  return location;
}

export function getReferences(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.ReferenceContext,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.Location[]> {
  const source = document.getValue();
  const interp = getInterp(spec, source);
  const idx = idxFromLineAndCol(source, {
    line: position.lineNumber,
    col: position.column,
  });
  const results = interp.queryStr(`ide.UsageAtPos{idx: ${idx}, usageSpan: US}`);
  return results.map(
    (res) =>
      new monaco.Location(
        document.uri,
        spanToRange(source, (res.term as Rec).attrs.usageSpan as Rec)
      )
  );
}

const HIGHLIGHT_KINDS = {
  defn: monaco.languages.DocumentHighlightKind.Write,
  usage: monaco.languages.DocumentHighlightKind.Read,
};

export function getHighlights(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.DocumentHighlight[]> {
  const source = document.getValue();
  const interp = getInterp(spec, source);
  const idx = idxFromLineAndCol(source, {
    line: position.lineNumber,
    col: position.column,
  });
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.CurrentUsageOrDefn{span: S, type: T}`);
  return results.map((res) => {
    const result = res.term as Rec;
    const kind = result.attrs.type as StringLit;
    const range = spanToRange(source, result.attrs.span as Rec);
    return {
      range,
      kind: HIGHLIGHT_KINDS[kind.val],
    };
  });
}

export function getCompletionItems(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  context: monaco.languages.CompletionContext
): monaco.languages.ProviderResult<monaco.languages.CompletionItem[]> {
  const source = document.getValue();
  const idx = idxFromLineAndCol(source, {
    line: position.lineNumber,
    col: position.column,
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
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  newName: string,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.WorkspaceEdit> {
  const source = document.getValue();
  const idx = idxFromLineAndCol(source, {
    line: position.lineNumber,
    col: position.column,
  });
  const interp = getInterp(spec, source);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.RenameSpan{name: N, span: S}`);

  const edits: monaco.languages.TextEdit[] = [];
  results.forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    edits.push({
      range,
      text: newName,
    });
  });
  return edits;
}

export function prepareRename(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.ProviderResult<monaco.languages.RenameLocation> {
  const source = document.getValue();
  const idx = idxFromLineAndCol(source, {
    line: position.lineNumber,
    col: position.column,
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
  document: monaco.editor.ITextModel,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<
  monaco.SymbolInformation[] | monaco.DocumentSymbol[]
> {
  const source = document.getValue();
  const interp = getInterp(spec, source);

  const results = interp.queryStr(
    `scope.Defn{scopeID: ${ppt(GLOBAL_SCOPE)}, name: N, span: S, kind: K}`
  );

  return results.map((res) => {
    const rec = res.term as Rec;
    const name = (rec.attrs.name as StringLit).val;
    const range = spanToRange(source, rec.attrs.span as Rec);
    return new monaco.SymbolInformation(
      name,
      monaco.SymbolKind.Function,
      "",
      new monaco.Location(document.uri, range)
    );
  });
}

export function getSemanticTokens(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.SemanticTokens> {
  const source = document.getValue();
  const interp = getInterp(spec, source);
  const results = interp.queryStr("hl.NonHighlightSegment{}");

  const builder = new monaco.SemanticTokensBuilder(semanticTokensLegend);
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
export const semanticTokensLegend = new monaco.SemanticTokensLegend([
  "number",
  "string",
  "keyword",
  "comment",
  "variable",
  "typeParameter",
]);

export function refreshDiagnostics(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  diagnostics: monaco.DiagnosticCollection
) {
  const source = document.getValue();
  const interp = getInterp(spec, source);

  const problems = interp.queryStr("tc.Problem{}");
  const diags = problems.map((res) =>
    problemToDiagnostic(source, res.term as Rec)
  );
  diagnostics.set(document.uri, diags);
}

function problemToDiagnostic(source: string, rec: Rec): monaco.Diagnostic {
  const span = dlToSpan(rec.attrs.span as Rec);
  const from = lineAndColFromIdx(source, span.from);
  const to = lineAndColFromIdx(source, span.to);

  const range = new monaco.Range(from.line, from.col, to.line, to.col);
  return new monaco.Diagnostic(range, ppt(rec.attrs.desc));
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

// utils

export function idxToPosition(source: string, idx: number): monaco.Position {
  const lineAndCol = lineAndColFromIdx(source, idx);
  return new monaco.Position(lineAndCol.line, lineAndCol.col);
}

export function spanToRange(source: string, dlSpan: Rec): monaco.Range {
  const span = dlToSpan(dlSpan);
  const from = idxToPosition(source, span.from);
  const to = idxToPosition(source, span.to);
  return new monaco.Range(
    from.lineNumber,
    from.column,
    to.lineNumber,
    to.column
  );
}
