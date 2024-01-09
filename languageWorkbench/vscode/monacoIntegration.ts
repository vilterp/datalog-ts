import * as monaco from "monaco-editor";
import { Monaco } from "@monaco-editor/react";
import { Rec, StringLit } from "../../core/types";
import { dlToSpan, lineAndColFromIdx } from "../sourcePositions";
import { ppt } from "../../core/pretty";
import { SemanticTokensBuilder } from "./semanticTokensBuilder";
import { getInterp, GLOBAL_SCOPE, TOKEN_TYPES } from "./common";
import { uniqBy } from "../../util/util";
import { LanguageSpec } from "../common/types";

export function registerLanguageSupport(
  monacoInstance: Monaco,
  spec: LanguageSpec
): monaco.IDisposable[] {
  const subscriptions: monaco.IDisposable[] = [];

  monacoInstance.languages.register({ id: spec.name });

  // go to defn
  subscriptions.push(
    monacoInstance.languages.registerDefinitionProvider(spec.name, {
      provideDefinition(
        document: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.Definition> {
        console.log("==== provideDefinition");
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
    monacoInstance.languages.registerReferenceProvider(spec.name, {
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
    monacoInstance.languages.registerDocumentHighlightProvider(spec.name, {
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
    monacoInstance.languages.registerCompletionItemProvider(spec.name, {
      triggerCharacters: spec.triggerCharacters,
      provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
        try {
          return getCompletionItems(spec, model, position, token, context);
        } catch (e) {
          console.error("in completion provider:", e);
        }
      },
    })
  );

  // renames
  subscriptions.push(
    monacoInstance.languages.registerRenameProvider(spec.name, {
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
    monacoInstance.languages.registerDocumentSymbolProvider(spec.name, {
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
    monacoInstance.languages.registerDocumentSemanticTokensProvider(spec.name, {
      provideDocumentSemanticTokens(
        model: monaco.editor.ITextModel,
        lastResultId: string | null,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.SemanticTokens> {
        try {
          const before = new Date().getTime();
          const tokens = getSemanticTokens(spec, model, token);
          const after = new Date().getTime();
          console.log("getSemanticTokens for", spec.name, after - before, "ms");
          return tokens;
        } catch (e) {
          console.error("in token provider:", e);
        }
      },
      getLegend() {
        return semanticTokensLegend;
      },
      releaseDocumentSemanticTokens() {
        // TODO: ...?
      },
    })
  );

  return subscriptions;
}

function getDefinition(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.Definition> {
  console.log("getDefinition", spec.name);
  const source = document.getValue();
  const interp = getInterp(spec, document.uri.toString(), source);
  const idx = idxFromPosition(source, position);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.DefnForCursor{defnSpan: DS}?`);
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  return {
    uri: document.uri,
    range: spanToRange(source, result.attrs.defnSpan as Rec),
  };
}

function getReferences(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.ReferenceContext,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.Location[]> {
  console.log("getDefinition", spec.name);
  const source = document.getValue();
  const interp = getInterp(spec, document.uri.toString(), source);
  const idx = idxFromPosition(source, position);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.UsageForCursor{usageSpan: US}?`);
  return results.map((res) => ({
    uri: document.uri,
    range: spanToRange(source, (res.term as Rec).attrs.usageSpan as Rec),
  }));
}

const HIGHLIGHT_KINDS = {
  defn: monaco.languages.DocumentHighlightKind.Write,
  usage: monaco.languages.DocumentHighlightKind.Read,
};

function getHighlights(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.DocumentHighlight[]> {
  console.log("getHighlights", spec.name);
  const source = document.getValue();
  const interp = getInterp(spec, document.uri.toString(), source);
  const idx = idxFromPosition(source, position);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  // pattern match `span` to avoid getting `"builtin"`
  const results = interp2.queryStr(
    `ide.CurrentUsageOrDefn{span: span{from: F, to: T}, type: Ty}?`
  );
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

function getCompletionItems(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  context: monaco.languages.CompletionContext
): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
  console.log("getCompletionItems", spec.name);
  const source = document.getValue();
  const idx = idxFromPosition(source, position);
  const sourceWithPlaceholder =
    source.slice(0, idx) + "???" + source.slice(idx);
  const interp = getInterp(
    spec,
    document.uri.toString(),
    sourceWithPlaceholder
  );
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    `ide.CurrentSuggestion{name: N, span: S, type: T}?`
  );
  const uniqueResults = uniqBy(
    (res) => ((res.term as Rec).attrs.name as StringLit).val,
    results
  );
  const out = {
    suggestions: uniqueResults.map((res) => {
      const result = res.term as Rec;
      const label = result.attrs.name as StringLit;
      const range = spanToRange(
        sourceWithPlaceholder,
        result.attrs.span as Rec
      );
      return {
        insertText: label.val,
        label: label.val,
        range: new monaco.Range(
          range.startLineNumber,
          range.startColumn,
          range.startLineNumber,
          range.startColumn
        ),
        kind: monaco.languages.CompletionItemKind.Variable,
      };
    }),
  };
  return out;
}

function getRenameEdits(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  newName: string,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.WorkspaceEdit> {
  console.log("getRenameEdits", spec.name);
  const source = document.getValue();
  const idx = idxFromPosition(source, position);
  const interp = getInterp(spec, document.uri.toString(), source);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.RenameSpan{name: N, span: S}?`);

  const edits: monaco.languages.WorkspaceTextEdit[] = [];
  uniqBy((res) => ppt(res.term), results).forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    edits.push({
      resource: document.uri,
      edit: {
        range,
        text: newName,
      },
    });
  });
  return { edits };
}

function prepareRename(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.ProviderResult<monaco.languages.RenameLocation> {
  const source = document.getValue();
  const idx = idxFromPosition(source, position);
  const interp = getInterp(spec, document.uri.toString(), source);
  const interp2 = interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    "ide.CurrentDefnOrDefnOfCurrentVar{span: S}?"
  );
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  const dlSpan = result.attrs.span as Rec;
  const span = dlToSpan(dlSpan);
  return {
    range: spanToRange(source, dlSpan),
    text: source.slice(span.from, span.to),
  };
}

function getSymbolList(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.DocumentSymbol[]> {
  const source = document.getValue();
  const interp = getInterp(spec, document.uri.toString(), source);

  const results = interp.queryStr(
    `scope.Defn{scopeID: ${ppt(GLOBAL_SCOPE)}, name: N, span: S, kind: K}?`
  );

  return results.map((res) => {
    const rec = res.term as Rec;
    const name = (rec.attrs.name as StringLit).val;
    const range = spanToRange(source, rec.attrs.span as Rec);
    return {
      name,
      kind: monaco.languages.SymbolKind.Function,
      detail: "",
      range: range,
      selectionRange: range,
      tags: [],
    };
  });
}

function getSemanticTokens(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.SemanticTokens> {
  const source = document.getValue();
  const interp = getInterp(spec, document.uri.toString(), source);
  const results = interp.queryStr("hl.NonHighlightSegment{}?");

  const builder = new SemanticTokensBuilder(semanticTokensLegend);
  results.forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    const typ = (result.attrs.type as StringLit).val;
    builder.push(range, typ);
  });
  return builder.build();
}

const semanticTokensLegend: monaco.languages.SemanticTokensLegend = {
  tokenTypes: TOKEN_TYPES,
  tokenModifiers: [],
};

export function getMarkers(
  spec: LanguageSpec,
  document: monaco.editor.ITextModel
): monaco.editor.IMarker[] {
  const source = document.getValue();
  const interp = getInterp(spec, document.uri.toString(), source);

  const problems = interp.queryStr("tc.Problem{}?");
  return problems.map((res) => problemToDiagnostic(document, res.term as Rec));
}

function problemToDiagnostic(
  model: monaco.editor.ITextModel,
  rec: Rec
): monaco.editor.IMarker {
  const source = model.getValue();
  const span = dlToSpan(rec.attrs.span as Rec);
  const from = lineAndColFromIdx(source, span.from);
  const to = lineAndColFromIdx(source, span.to);

  const desc = ppt(rec.attrs.desc);
  return {
    startLineNumber: from.line + 1,
    startColumn: from.col + 1,
    endLineNumber: to.line + 1,
    endColumn: to.col + 1,
    message: desc,
    owner: "lingo",
    resource: model.uri,
    severity: monaco.MarkerSeverity.Error,
  };
}

// utils

// Monaco uses 1-indexed positions; vscode uses 0-indexed. So, the Monaco
// integration needs its own utilities here.
// TODO: unit test these...

function positionFromIdx(source: string, idx: number): monaco.Position {
  const lineAndCol = lineAndColFromIdx(source, idx);
  // TODO: this is kind of a hack
  const line = Math.max(0, lineAndCol.line);
  const col = Math.max(0, lineAndCol.col);
  const out = new monaco.Position(line + 1, col + 1);
  return out;
}

function spanToRange(source: string, dlSpan: Rec): monaco.Range {
  const span = dlToSpan(dlSpan);
  const from = positionFromIdx(source, span.from);
  const to = positionFromIdx(source, span.to);
  return new monaco.Range(
    from.lineNumber,
    from.column,
    to.lineNumber,
    to.column
  );
}

export function idxFromPosition(source: string, pos: monaco.Position): number {
  const lines = source.split("\n");
  let out = 0;
  for (let curLine = 0; curLine < pos.lineNumber - 1; curLine++) {
    out += lines[curLine].length + 1; // +1 for newline
  }
  return out + pos.column - 1;
}
