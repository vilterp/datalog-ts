import * as vscode from "vscode";
import {
  getDefinition,
  getHighlights,
  getReferences,
  refreshDiagnostics,
} from "./engine";

export function activate(context: vscode.ExtensionContext) {
  console.log("activate!");

  // diagnostics
  const diagnostics = vscode.languages.createDiagnosticCollection("datalog");
  context.subscriptions.push(diagnostics);
  subscribeToChanges(context, diagnostics);

  // go to defn
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider("datalog", {
      provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Definition> {
        try {
          return getDefinition(document, position, token);
        } catch (e) {
          console.error("in definition provider:", e);
        }
      },
    })
  );

  // references
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider("datalog", {
      provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Location[]> {
        try {
          return getReferences(document, position, context, token);
        } catch (e) {
          console.error("in reference provider:", e);
        }
      },
    })
  );

  // highlight
  context.subscriptions.push(
    vscode.languages.registerDocumentHighlightProvider("datalog", {
      provideDocumentHighlights(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.DocumentHighlight[]> {
        try {
          return getHighlights(document, position, token);
        } catch (e) {
          console.error("in highlight provider:", e);
        }
      },
    })
  );

  // TODO: completions
}

function subscribeToChanges(
  context: vscode.ExtensionContext,
  diagnostics: vscode.DiagnosticCollection
) {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document, diagnostics);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(editor.document, diagnostics);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) =>
      refreshDiagnostics(e.document, diagnostics)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      diagnostics.delete(doc.uri)
    )
  );
}
