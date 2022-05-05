import * as vscode from "vscode";
import {
  getCompletionItems,
  getDefinition,
  getHighlights,
  getReferences,
  getRenameEdits,
  getSemanticTokens,
  getSymbolList,
  prepareRename,
  refreshDiagnostics,
  semanticTokensLegend,
} from "./engine";
import * as path from "path";
import { MessageToWebView } from "./types";

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

  // completions
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider("datalog", {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
      ): vscode.ProviderResult<vscode.CompletionItem[]> {
        try {
          return getCompletionItems(document, position, token, context);
        } catch (e) {
          console.error("in completion provider:", e);
        }
      },
    })
  );

  // renames
  context.subscriptions.push(
    vscode.languages.registerRenameProvider("datalog", {
      provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.WorkspaceEdit> {
        try {
          return getRenameEdits(document, position, newName, token);
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
          return prepareRename(document, position);
        } catch (e) {
          console.error("in prepare rename:", e);
        }
      },
    })
  );

  // symbols
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider("datalog", {
      provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<
        vscode.SymbolInformation[] | vscode.DocumentSymbol[]
      > {
        try {
          return getSymbolList(document, token);
        } catch (e) {
          console.error("in symbol provider:", e);
        }
      },
    })
  );

  // syntax highlighting
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      "datalog",
      {
        provideDocumentSemanticTokens(
          document: vscode.TextDocument,
          token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.SemanticTokens> {
          try {
            return getSemanticTokens(document, token);
          } catch (e) {
            console.error("in token provider:", e);
          }
        },
      },
      semanticTokensLegend
    )
  );

  // explorer web view
  context.subscriptions.push(
    vscode.commands.registerCommand("datalog.openExplorer", () => {
      // Create and show a new webview
      const panel = vscode.window.createWebviewPanel(
        "datalogExplorer",
        "Datalog Explorer",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          enableFindWidget: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "out")),
          ],
        }
      );
      const jsDiskPath = vscode.Uri.file(
        path.join(context.extensionPath, "out", "webView.js")
      );
      const jsURL = panel.webview.asWebviewUri(jsDiskPath);
      panel.webview.html = getWebViewContent(jsURL);

      if (vscode.window.activeTextEditor) {
        // TODO: not sure the handler is installed yet...
        // could wait a bit, but that's flaky
        sendContents(panel.webview, vscode.window.activeTextEditor.document);
      }
      context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
          sendContents(panel.webview, e.document);
        })
      );

      // TODO: dispose this stuff?
    })
  );
}

function sendContents(webview: vscode.Webview, doc: vscode.TextDocument) {
  const msg: MessageToWebView = {
    type: "ContentsUpdated",
    text: doc.getText(),
  };
  webview.postMessage(msg);
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

function getWebViewContent(jsURL: vscode.Uri) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Datalog Explorer</title>
  </head>
  <body style="background-color: white">
    <div id="main"></div>

    <script src="${jsURL.toString()}"></script>
  </body>
</html>
`;
}
