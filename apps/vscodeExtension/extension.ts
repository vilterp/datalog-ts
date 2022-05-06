import * as vscode from "vscode";
import {
  refreshDiagnostics,
  registerLanguageSupport,
} from "../../uiCommon/ide/editorIntegration";
import * as path from "path";
import { MessageFromWebView, MessageToWebView } from "./types";

export function activate(context: vscode.ExtensionContext) {
  console.log("activate!");

  registerExplorerWebView(context);
  registerLanguageSupport(context);

  const diagnostics = vscode.languages.createDiagnosticCollection("datalog");
  context.subscriptions.push(diagnostics);
  subscribeDiagnosticsToChanges(context, diagnostics);
}

function subscribeDiagnosticsToChanges(
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

function registerExplorerWebView(context: vscode.ExtensionContext) {
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

      subscribeWebViewToChanges(context, panel);
    })
  );
}

function subscribeWebViewToChanges(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const originalActiveEditor = vscode.window.activeTextEditor;
  context.subscriptions.push(
    panel.webview.onDidReceiveMessage((evt) => {
      const msg: MessageFromWebView = evt as MessageFromWebView;

      switch (msg.type) {
        case "ReadyForMessages":
          if (originalActiveEditor) {
            sendContents(panel.webview, originalActiveEditor.document);
          }
          break;
        default:
          console.error("uknown message:", msg);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      sendContents(panel.webview, e.document);
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
