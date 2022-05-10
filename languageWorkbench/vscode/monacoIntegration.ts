import * as monaco from "monaco-editor";
import { Monaco } from "@monaco-editor/react";
import { LanguageSpec } from "../languages";
import { Rec, StringLit } from "../../core/types";
import { dlToSpan, lineAndColFromIdx } from "../sourcePositions";
import { ppt } from "../../core/pretty";
import { SemanticTokensBuilder } from "./semanticTokensBuilder";
import { getInterp, GLOBAL_SCOPE, TOKEN_TYPES } from "./common";
import { uniqBy } from "../../util/util";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { RefObject } from "react";

export type InterpGetter = { source: string; interp: AbstractInterpreter };

export function registerLanguageSupport(
  monacoInstance: Monaco,
  spec: LanguageSpec,
  interpGetter: RefObject<InterpGetter>
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
        try {
          const interp = interpGetter.current;
          return getDefinition(interp, document, position, token);
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
          const interp = interpGetter.current;
          return getReferences(interp, document, position, context, token);
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
          const interp = interpGetter.current;
          return getHighlights(interp, document, position, token);
        } catch (e) {
          console.error("in highlight provider:", e);
        }
      },
    })
  );

  // completions
  subscriptions.push(
    monacoInstance.languages.registerCompletionItemProvider(spec.name, {
      provideCompletionItems(
        document: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
        try {
          const interp = interpGetter.current;
          return getCompletionItems(interp, document, position, token, context);
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
          const interp = interpGetter.current;
          return getRenameEdits(interp, document, position, newName, token);
        } catch (e) {
          console.error("in rename provider:", e);
        }
      },
      resolveRenameLocation(
        document: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.RenameLocation> {
        try {
          const interp = interpGetter.current;
          return prepareRename(interp, document, position);
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
          const interp = interpGetter.current;
          return getSymbolList(interp, document, token);
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
        document: monaco.editor.ITextModel,
        lastResultId: string | null,
        token: monaco.CancellationToken
      ): monaco.languages.ProviderResult<monaco.languages.SemanticTokens> {
        try {
          const before = new Date().getTime();
          const interp = interpGetter.current;
          const tokens = getSemanticTokens(interp, document, token);
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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.Definition> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }
  const idx = idxFromPosition(source, position);
  const results = interpAndSource.interp.queryStr(
    `ide.DefnAtPos{idx: ${idx}, defnSpan: US}`
  );
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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.ReferenceContext,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.Location[]> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }
  const idx = idxFromPosition(source, position);
  const results = interpAndSource.interp.queryStr(
    `ide.UsageAtPos{idx: ${idx}, usageSpan: US}`
  );
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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.DocumentHighlight[]> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }
  const idx = idxFromPosition(source, position);
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  // pattern match `span` to avoid getting `"builtin"`
  const results = interp2.queryStr(
    `ide.CurrentUsageOrDefn{span: span{from: F, to: T}, type: Ty}`
  );
  console.log(
    "get some highlights:",
    position.lineNumber,
    position.column,
    idx,
    results.map((res) => {
      const result = res.term as Rec;
      const span = dlToSpan(result.attrs.span as Rec);
      const sliced = source.slice(span.from, span.to);
      return [ppt(res.term), sliced];
    })
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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  context: monaco.languages.CompletionContext
): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }
  const idx = idxFromPosition(source, position);
  const sourceWithPlaceholder =
    source.slice(0, idx) + "???" + source.slice(idx);
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    `ide.CurrentSuggestion{name: N, span: S, type: T}`
  );
  const uniqueResults = uniqBy(
    (res) => ((res.term as Rec).attrs.name as StringLit).val,
    results
  );
  console.log("getCompletionItems", { uniqueResults });
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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  position: monaco.Position,
  newName: string,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.WorkspaceEdit> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }
  const idx = idxFromPosition(source, position);
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.RenameSpan{name: N, span: S}`);

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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  position: monaco.Position
): monaco.languages.ProviderResult<monaco.languages.RenameLocation> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }
  const idx = idxFromPosition(source, position);
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    "ide.CurrentDefnOrDefnOfCurrentVar{span: S}"
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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.DocumentSymbol[]> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }

  const results = interpAndSource.interp.queryStr(
    `scope.Defn{scopeID: ${ppt(GLOBAL_SCOPE)}, name: N, span: S, kind: K}`
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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel,
  token: monaco.CancellationToken
): monaco.languages.ProviderResult<monaco.languages.SemanticTokens> {
  const source = document.getValue();
  if (source !== interpAndSource.source) {
    console.error("not matching", {
      source,
      givenSource: interpAndSource.source,
    });
  }
  const results = interpAndSource.interp.queryStr("hl.NonHighlightSegment{}");

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
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: monaco.editor.ITextModel
): monaco.editor.IMarker[] {
  const problems = interpAndSource.interp.queryStr("tc.Problem{}");
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
  const out = new monaco.Position(lineAndCol.line + 1, lineAndCol.col + 1);
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
