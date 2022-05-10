import * as vscode from "vscode";
import {
  refreshDiagnostics,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/vscodeIntegration";
import * as path from "path";
import { MessageFromWebView, MessageToWebView } from "./types";
import { LANGUAGES, LanguageSpec } from "../../languageWorkbench/languages";
import { constructInterp, InterpCache } from "../../languageWorkbench/interp";
import {
  INIT_INTERP,
  InterpGetter,
} from "../../languageWorkbench/vscode/common";

const INTERP_CACHE: InterpCache = {};

const interpGetter: InterpGetter = {
  getInterp: (fileName) => {
    const res = INTERP_CACHE[fileName];
    return { interp: res.lastResult.interp, source: res.lastSource };
  },
};

export function activate(context: vscode.ExtensionContext) {
  console.log("activate!");
  try {
    registerExplorerWebView(context);

    // TODO: build interp each time the doc changes?

    [LANGUAGES.datalog, LANGUAGES.grammar].forEach((spec) => {
      const diagnostics = vscode.languages.createDiagnosticCollection(
        spec.name
      );
      context.subscriptions.push(diagnostics);
      subscribeToCurrentDoc((doc) => {
        console.log("updating interp cache for", doc);
        if (doc.uri.toString().endsWith(spec.name)) {
          const source = doc.getText();
          const res = constructInterp(INIT_INTERP, spec, source);
          INTERP_CACHE[doc.uri.toString()] = {
            lastInitInterp: INIT_INTERP,
            lastLangSpec: spec,
            lastResult: res,
            lastSource: source,
          };
          refreshDiagnostics({ interp: res.interp, source }, doc, diagnostics);
        }
      });

      registerLanguageSupport(spec, interpGetter).forEach((sub) => {
        context.subscriptions.push(sub);
      });
    });
  } catch (e) {
    console.error("in activation:", e);
  }
}

// TODO: dispose when something closes
function subscribeToCurrentDoc(
  callback: (doc: vscode.TextDocument) => void,
  closeCallback?: (doc: vscode.TextDocument) => void
): vscode.Disposable[] {
  const subs: vscode.Disposable[] = [];

  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    callback(doc);
  }
  subs.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        callback(editor.document);
      }
    })
  );

  subs.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      callback(e.document);
    })
  );

  subs.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      if (closeCallback) {
        closeCallback(doc);
      }
    })
  );

  return subs;
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
