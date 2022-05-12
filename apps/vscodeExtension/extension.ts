import * as vscode from "vscode";
import {
  InterpGetter,
  refreshDiagnostics,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/vscodeIntegration";
import * as path from "path";
import { MessageFromWebView, MessageToWebView } from "./types";
import { LANGUAGES } from "../../languageWorkbench/languages";
import {
  Action,
  Effect,
  initialState,
  InterpAndSource,
  State,
  update,
} from "../../languageWorkbench/vscode/common";
import { dispatch, StateRef } from "../../languageWorkbench/vscode/dispatch";

const LANGUAGES_TO_REGISTER = [LANGUAGES.datalog, LANGUAGES.grammar];

function runEffect(state: State, effect: Effect): Action[] {
  switch (effect.type) {
    case "RegisterLangInEditor": {
      const subs = registerLanguageSupport(effect.langSpec, interpGetter);
      return [{ type: "LangUpdated", langID: effect.langSpec.name, subs }];
    }
    case "UpdateLangInEditor": {
      state.registeredLanguages[effect.newLangSpec.name].subs.forEach((sub) => {
        sub.dispose();
      });
      const subs = registerLanguageSupport(effect.newLangSpec, interpGetter);
      return [{ type: "LangUpdated", langID: effect.newLangSpec.name, subs }];
    }
    case "UpdateProblems": {
      const entry = state.files[effect.uri];
      const interpAndSource: InterpAndSource = {
        interp: entry.interp,
        source: entry.source,
      };
      refreshDiagnostics(
        interpAndSource,
        effect.uri,
        effect.newProblems,
        DIAGNOSTICS
      );
      return [];
    }
  }
}

let STATE: StateRef = { state: initialState, update, runEffect };
const DIAGNOSTICS = vscode.languages.createDiagnosticCollection("lingo");

const interpGetter: InterpGetter = {
  getInterp: (uri: string) => {
    const res = STATE.state.files[uri];
    // TODO: should prob just return the whole thing, including the spec
    return { interp: res.interp, source: res.source };
  },
};

export function activate(context: vscode.ExtensionContext) {
  console.log("activate!");

  try {
    registerInitialLanguages();
    registerExplorerWebView(context);
    // TODO: is one collection for all languages ok?

    subscribeToCurrentDoc().forEach((sub) => {
      context.subscriptions.push(sub);
    });
  } catch (e) {
    console.error("in activation:", e);
  }
}

// TODO: dispose when something closes
function subscribeToCurrentDoc(): vscode.Disposable[] {
  const subs: vscode.Disposable[] = [];

  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    dispatch(STATE, {
      type: "CreateDoc",
      uri: doc.uri.toString(),
      initSource: doc.getText(),
      langSpec: LANGUAGES[doc.languageId],
    });
  }
  subs.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        // This could be a doc that already exists, I guess? oh well
        const doc = editor.document;
        dispatch(STATE, {
          type: "CreateDoc",
          uri: doc.uri.toString(),
          initSource: doc.getText(),
          langSpec: LANGUAGES[doc.languageId],
        });
      }
    })
  );

  subs.push(
    vscode.workspace.onDidChangeTextDocument((evt) => {
      dispatch(STATE, {
        type: "EditDoc",
        newSource: evt.document.getText(),
        uri: evt.document.uri.toString(),
        reason: evt.reason ? evt.reason.toString() : "",
      });
    })
  );

  subs.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      // TODO: delete doc I guess
    })
  );

  return subs;
}

function registerInitialLanguages() {
  LANGUAGES_TO_REGISTER.forEach((langSpec) => {
    dispatch(STATE, { type: "CreateLang", newLangSpec: langSpec });
  });
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
