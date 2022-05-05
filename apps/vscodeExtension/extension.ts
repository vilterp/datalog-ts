import * as vscode from "vscode";
import { getDefinition, refreshDiagnostics } from "./engine";

export function activate(context: vscode.ExtensionContext) {
  console.log("activate!");

  // diagnostics
  const diagnostics = vscode.languages.createDiagnosticCollection("datalog");
  context.subscriptions.push(diagnostics);
  subscribeToChanges(context, diagnostics);

  // completions
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider("datalog", {
      provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Definition> {
        console.log("hello from definition provider");
        const defn = getDefinition(document, position, token);
        console.log("defn", defn);
        return defn;
      },
    })
  );
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
