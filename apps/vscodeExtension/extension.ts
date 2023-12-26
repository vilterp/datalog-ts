import * as vscode from "vscode";
import * as fs from "fs";
import {
  refreshDiagnostics,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/vscodeIntegration";
import * as path from "path";
import { MessageFromWebView, MessageToWebView } from "./types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { LanguageSpec } from "../../languageWorkbench/common/types";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { fsLoader } from "../../core/fsLoader";
import {
  FactsProvider,
  RulesProvider,
  VisualizationsProvider,
} from "./providers";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

export async function activate(context: vscode.ExtensionContext) {
  console.log("activate!");

  registerExplorerWebView(context);

  [LANGUAGES.datalog, LANGUAGES.grammar, LANGUAGES.basicBlocks].forEach(
    (spec) => {
      registerLanguageSupport(spec).forEach((sub) => {
        context.subscriptions.push(sub);
      });
      registerDiagnosticsSupport(context, spec);
    }
  );

  const folders = vscode.workspace.workspaceFolders;
  let interp: AbstractInterpreter = new IncrementalInterpreter(
    folders ? folders[0].uri.path : ".",
    fsLoader
  );

  // execute main.dl if it exists
  const mainPath = path.join(folders ? folders[0].uri.path : ".", "main.dl");
  if (fs.existsSync(mainPath)) {
    const contents = await fs.promises.readFile(mainPath);
    interp = interp.evalStr(contents.toString())[1];
  }

  vscode.window.registerTreeDataProvider(
    "datalog-ts-facts",
    new FactsProvider(interp)
  );
  vscode.window.registerTreeDataProvider(
    "datalog-ts-rules",
    new RulesProvider(interp)
  );
  vscode.window.registerTreeDataProvider(
    "datalog-ts-visualizations",
    new VisualizationsProvider(interp)
  );
}

function registerDiagnosticsSupport(
  context: vscode.ExtensionContext,
  spec: LanguageSpec
) {
  const diagnostics = vscode.languages.createDiagnosticCollection(spec.name);
  context.subscriptions.push(diagnostics);
  subscribeDiagnosticsToChanges(context, spec, diagnostics);
}

function subscribeDiagnosticsToChanges(
  context: vscode.ExtensionContext,
  spec: LanguageSpec,
  diagnostics: vscode.DiagnosticCollection
) {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(
      spec,
      vscode.window.activeTextEditor.document,
      diagnostics
    );
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(spec, editor.document, diagnostics);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) =>
      refreshDiagnostics(spec, e.document, diagnostics)
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

      const subs = subscribeWebViewToChanges(panel);
      panel.onDidDispose(() => {
        subs.forEach((disposable) => disposable.dispose());
      });
    })
  );
}

function subscribeWebViewToChanges(
  panel: vscode.WebviewPanel
): vscode.Disposable[] {
  const subs: vscode.Disposable[] = [];

  const originalActiveEditor = vscode.window.activeTextEditor;
  subs.push(
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

  subs.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      sendContents(panel.webview, e.document);
    })
  );

  return subs;
}

function sendContents(webview: vscode.Webview, doc: vscode.TextDocument) {
  if (!doc.fileName.endsWith(".dl")) {
    return;
  }
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
