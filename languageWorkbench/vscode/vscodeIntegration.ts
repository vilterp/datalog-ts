import * as vscode from "vscode";
import { LanguageSpec } from "../languages";
import { Rec, StringLit } from "../../core/types";
import {
  dlToSpan,
  idxFromLineAndCol,
  lineAndColFromIdx,
} from "../sourcePositions";
import { ppt } from "../../core/pretty";
import { getInterp, GLOBAL_SCOPE, InterpGetter, TOKEN_TYPES } from "./common";
import { uniqBy } from "../../util/util";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

export function registerLanguageSupport(
  spec: LanguageSpec,
  interpGetter: InterpGetter
): vscode.Disposable[] {
  const subscriptions: vscode.Disposable[] = [];

  // go to defn
  subscriptions.push(
    vscode.languages.registerDefinitionProvider(spec.name, {
      provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Definition> {
        try {
          const interp = interpGetter.getInterp();
          return getDefinition(interp, document, position, token);
        } catch (e) {
          console.error("in definition provider:", e);
        }
      },
    })
  );

  // references
  subscriptions.push(
    vscode.languages.registerReferenceProvider(spec.name, {
      provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Location[]> {
        try {
          const interp = interpGetter.getInterp();
          return getReferences(interp, document, position, context, token);
        } catch (e) {
          console.error("in reference provider:", e);
        }
      },
    })
  );

  // highlight
  subscriptions.push(
    vscode.languages.registerDocumentHighlightProvider(spec.name, {
      provideDocumentHighlights(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.DocumentHighlight[]> {
        try {
          const interp = interpGetter.getInterp();
          return getHighlights(interp, document, position, token);
        } catch (e) {
          console.error("in highlight provider:", e);
        }
      },
    })
  );

  // completions
  subscriptions.push(
    vscode.languages.registerCompletionItemProvider(spec.name, {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
      ): vscode.ProviderResult<vscode.CompletionItem[]> {
        try {
          const interp = interpGetter.getInterp();
          return getCompletionItems(interp, document, position, token, context);
        } catch (e) {
          console.error("in completion provider:", e);
        }
      },
    })
  );

  // renames
  subscriptions.push(
    vscode.languages.registerRenameProvider(spec.name, {
      provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.WorkspaceEdit> {
        try {
          const interp = interpGetter.getInterp();
          return getRenameEdits(interp, document, position, newName, token);
        } catch (e) {
          console.error("in rename provider:", e);
        }
      },
      prepareRename(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Range> {
        try {
          const interp = interpGetter.getInterp();
          return prepareRename(interp, document, position);
        } catch (e) {
          console.error("in prepare rename:", e);
        }
      },
    })
  );

  // symbols
  subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(spec.name, {
      provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<
        vscode.SymbolInformation[] | vscode.DocumentSymbol[]
      > {
        try {
          const interp = interpGetter.getInterp();
          return getSymbolList(interp, document, token);
        } catch (e) {
          console.error("in symbol provider:", e);
        }
      },
    })
  );

  // syntax highlighting
  subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      spec.name,
      {
        provideDocumentSemanticTokens(
          document: vscode.TextDocument,
          token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.SemanticTokens> {
          try {
            const interp = interpGetter.getInterp();
            const before = new Date().getTime();
            const tokens = getSemanticTokens(interp, document, token);
            const after = new Date().getTime();
            console.log(
              "getSemanticTokens for",
              spec.name,
              after - before,
              "ms"
            );
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

function getDefinition(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Definition> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const results = interpAndSource.interp.queryStr(
    `ide.DefnAtPos{idx: ${idx}, defnSpan: US}`
  );
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  const location = new vscode.Location(
    document.uri,
    spanToRange(source, result.attrs.defnSpan as Rec)
  );
  return location;
}

function getReferences(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.ReferenceContext,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Location[]> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const results = interpAndSource.interp.queryStr(
    `ide.UsageAtPos{idx: ${idx}, usageSpan: US}`
  );
  return results.map(
    (res) =>
      new vscode.Location(
        document.uri,
        spanToRange(source, (res.term as Rec).attrs.usageSpan as Rec)
      )
  );
}

const HIGHLIGHT_KINDS = {
  defn: vscode.DocumentHighlightKind.Write,
  usage: vscode.DocumentHighlightKind.Read,
};

function getHighlights(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.DocumentHighlight[]> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  // pattern match `span` to avoid getting `"builtin"`
  const results = interp2.queryStr(
    `ide.CurrentUsageOrDefn{span: span{from: F, to: T}, type: Ty}`
  );
  return results.map((res) => {
    const result = res.term as Rec;
    const kind = result.attrs.type as StringLit;
    const range = spanToRange(source, result.attrs.span as Rec);
    return new vscode.DocumentHighlight(range, HIGHLIGHT_KINDS[kind.val]);
  });
}

function getCompletionItems(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken,
  context: vscode.CompletionContext
): vscode.ProviderResult<vscode.CompletionItem[]> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const sourceWithPlaceholder =
    source.slice(0, idx) + "???" + source.slice(idx);
  const interp = interpAndSource.interp;
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    `ide.CurrentSuggestion{name: N, span: S, type: T}`
  );
  const uniqueResults = uniqBy(
    (res) => ((res.term as Rec).attrs.name as StringLit).val,
    results
  );
  console.log({ uniqueResults });
  return uniqueResults.map((res) => {
    const result = res.term as Rec;
    const label = result.attrs.name as StringLit;
    return {
      label: label.val,
    };
  });
}

function getRenameEdits(
  interpAndSource: { interp: AbstractInterpreter; source: string },
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
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(`ide.RenameSpan{name: N, span: S}`);

  const edit = new vscode.WorkspaceEdit();
  uniqBy((res) => ppt(res.term), results).forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    edit.replace(document.uri, range, newName);
  });
  return edit;
}

function prepareRename(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.ProviderResult<vscode.Range> {
  const source = document.getText();
  const idx = idxFromLineAndCol(source, {
    line: position.line,
    col: position.character,
  });
  const interp2 = interpAndSource.interp.evalStr(`ide.Cursor{idx: ${idx}}.`)[1];
  const results = interp2.queryStr(
    "ide.CurrentDefnOrDefnOfCurrentVar{span: S}"
  );
  if (results.length === 0) {
    return null;
  }
  const result = results[0].term as Rec;
  return spanToRange(source, result.attrs.span as Rec);
}

function getSymbolList(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
  const source = document.getText();

  const results = interpAndSource.interp.queryStr(
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

function getSemanticTokens(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.SemanticTokens> {
  const source = document.getText();
  const results = interpAndSource.interp.queryStr("hl.NonHighlightSegment{}");

  const builder = new vscode.SemanticTokensBuilder(semanticTokensLegend);
  results.forEach((res) => {
    const result = res.term as Rec;
    const range = spanToRange(source, result.attrs.span as Rec);
    const typ = (result.attrs.type as StringLit).val;
    builder.push(range, typ);
  });
  return builder.build();
}

export const semanticTokensLegend = new vscode.SemanticTokensLegend(
  TOKEN_TYPES
);

export function refreshDiagnostics(
  interpAndSource: { interp: AbstractInterpreter; source: string },
  document: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
) {
  const source = document.getText();

  const problems = interpAndSource.interp.queryStr("tc.Problem{}");
  const diags = problems.map((res) =>
    problemToDiagnostic(source, res.term as Rec)
  );
  diagnostics.set(document.uri, diags);
}

function problemToDiagnostic(source: string, rec: Rec): vscode.Diagnostic {
  const span = dlToSpan(rec.attrs.span as Rec);
  const from = lineAndColFromIdx(source, span.from);
  const to = lineAndColFromIdx(source, span.to);

  const range = new vscode.Range(from.line, from.col, to.line, to.col);
  return new vscode.Diagnostic(range, ppt(rec.attrs.desc));
}

// utils

function idxToPosition(source: string, idx: number): vscode.Position {
  const lineAndCol = lineAndColFromIdx(source, idx);
  return new vscode.Position(lineAndCol.line, lineAndCol.col);
}

function spanToRange(source: string, dlSpan: Rec): vscode.Range {
  const span = dlToSpan(dlSpan);
  const from = idxToPosition(source, span.from);
  const to = idxToPosition(source, span.to);
  return new vscode.Range(from, to);
}
