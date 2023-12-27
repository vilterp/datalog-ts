import * as vscode from "vscode";
import * as fs from "fs";
import {
  refreshDiagnostics,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/vscodeIntegration";
import * as path from "path";
import { MessageToWebView } from "./types";
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

  [LANGUAGES.datalog, LANGUAGES.grammar, LANGUAGES.basicBlocks].forEach(
    (spec) => {
      registerLanguageSupport(spec).forEach((sub) => {
        context.subscriptions.push(sub);
      });
      registerDiagnosticsSupport(context, spec);
    }
  );

  // Initialize interpreter

  const folders = vscode.workspace.workspaceFolders;
  let interp: AbstractInterpreter = new IncrementalInterpreter(
    folders ? folders[0].uri.path : ".",
    fsLoader
  );

  // Execute project's `main.dl` if it exists

  const mainPath = path.join(folders ? folders[0].uri.path : ".", "main.dl");
  if (fs.existsSync(mainPath)) {
    const contents = await fs.promises.readFile(mainPath);
    interp = interp.evalStr(contents.toString())[1];
  }

  // Register tree views

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

  // Register commands

  const panels: { [relationName: string]: vscode.WebviewPanel } = {};

  vscode.commands.registerCommand("datalog-ts.openRelation", (name: string) => {
    if (panels[name]) {
      panels[name].reveal();
      return;
    }

    vscode.window.registerWebviewViewProvider;

    const panel = vscode.window.createWebviewPanel(
      "relationEditor",
      name,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "out")),
        ],
        retainContextWhenHidden: true,
      }
    );
    panels[name] = panel;

    const jsDiskPath = vscode.Uri.file(
      path.join(context.extensionPath, "out", "relationEditor.js")
    );
    const jsURL = panel.webview.asWebviewUri(jsDiskPath);
    panel.webview.html = getWebViewContent(name, jsURL);

    const msg: MessageToWebView = {
      type: "Relation",
      relation: name,
      results: interp.queryStr(`${name}{}`),
    };

    panel.webview.postMessage(msg);

    panel.onDidDispose(() => {
      delete panels[name];
    });
  });
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

function getWebViewContent(title: string, jsURL: vscode.Uri) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
  </head>
  <body>
    <div id="main"></div>

    <script src="${jsURL.toString()}"></script>
  </body>
</html>
`;
}
