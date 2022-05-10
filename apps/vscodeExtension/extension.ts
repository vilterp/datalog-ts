import * as vscode from "vscode";
import {
  InterpGetter,
  refreshDiagnostics,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/vscodeIntegration";
import * as path from "path";
import { MessageFromWebView, MessageToWebView } from "./types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { constructInterp, InterpCache } from "../../languageWorkbench/interp";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";

const INTERP_CACHE: InterpCache = {};

const LANGUAGES_TO_REGISTER = {
  datalog: LANGUAGES.datalog,
  grammar: LANGUAGES.grammar,
};

const interpGetter: InterpGetter = {
  getInterp: (doc: vscode.TextDocument) => {
    const langID = doc.languageId;
    const spec = LANGUAGES_TO_REGISTER[langID];
    console.log("interpGetter:", doc);
    const source = doc.getText();

    const cachedRes = INTERP_CACHE[doc.uri.toString()];
    if (cachedRes) {
      if (
        cachedRes.lastInitInterp === INIT_INTERP &&
        cachedRes.lastLangSpec === spec &&
        cachedRes.lastSource === source
      ) {
        return {
          interp: cachedRes.lastResult.interp,
          source: cachedRes.lastSource,
        };
      }
    }

    const res = constructInterp(INIT_INTERP, spec, source);
    const newEntry = {
      lastInitInterp: INIT_INTERP,
      lastLangSpec: spec,
      lastResult: res,
      lastSource: source,
    };
    INTERP_CACHE[doc.uri.toString()] = newEntry;

    return {
      interp: newEntry.lastResult.interp,
      source: newEntry.lastSource,
    };
  },
};

export function activate(context: vscode.ExtensionContext) {
  console.log("activate!");
  try {
    registerExplorerWebView(context);

    Object.keys(LANGUAGES_TO_REGISTER).forEach((name) => {
      const spec = LANGUAGES_TO_REGISTER[name];
      const diagnostics = vscode.languages.createDiagnosticCollection(
        spec.name
      );
      context.subscriptions.push(diagnostics);
      subscribeToCurrentDoc((doc) => {
        console.log("updating interp cache for", doc);
        if (doc.languageId === spec.name) {
          const interpAndSource = interpGetter.getInterp(doc);
          refreshDiagnostics(interpAndSource, doc, diagnostics);
        }
      }).forEach((sub) => {
        context.subscriptions.push(sub);
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
