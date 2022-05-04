import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  // diagnostics
  const diagnostics = vscode.languages.createDiagnosticCollection("datalog");
  context.subscriptions.push(diagnostics);
  subscribeToChanges(context, diagnostics);
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

function refreshDiagnostics(
  doc: vscode.TextDocument,
  diagnostics: vscode.DiagnosticCollection
) {
  const out: vscode.Diagnostic[] = [createDiagnostic(doc, doc.lineAt(1))];

  // get contents of doc; do something

  diagnostics.set(doc.uri, out);
}

function createDiagnostic(
  doc: vscode.TextDocument,
  line: vscode.TextLine
): vscode.Diagnostic {
  // create range that represents, where in the document the word is
  const range = new vscode.Range(line.lineNumber, 1, line.lineNumber, 2);

  const diagnostic = new vscode.Diagnostic(
    range,
    "some problem",
    vscode.DiagnosticSeverity.Error
  );
  return diagnostic;
}
