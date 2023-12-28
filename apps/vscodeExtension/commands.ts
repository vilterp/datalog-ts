import * as vscode from "vscode";
import * as path from "path";
import { Context, MessageToWebView } from "./types";

export function openRelation(context: Context, name: string) {
  openPanel(
    context,
    "relationEditor",
    "relationEditor.js",
    {
      type: "Relation",
      relation: name,
      results: context.interp.queryStr(`${name}{}`),
    },
    name
  );
}

export function openVisualization(context: Context, name: string) {
  openPanel(
    context,
    "visualization",
    "visualization.js",
    {
      type: "Visualization",
      name,
      // problem is, you're gonna need the interp to render this
      results: context.interp.queryStr(`${name}{}`),
    },
    name
  );
}

function openPanel(
  context: Context,
  viewType: string,
  file: string,
  message: MessageToWebView,
  name: string
) {
  if (context.panels[name]) {
    context.panels[name].reveal();
    return;
  }

  vscode.window.registerWebviewViewProvider;

  const panel = vscode.window.createWebviewPanel(
    viewType,
    name,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.vscodeContext.extensionPath, "out")),
      ],
      retainContextWhenHidden: true,
    }
  );
  context.panels[name] = panel;

  const jsDiskPath = vscode.Uri.file(
    path.join(context.vscodeContext.extensionPath, "out", file)
  );
  const jsURL = panel.webview.asWebviewUri(jsDiskPath);
  panel.webview.html = getWebViewContent(name, jsURL);

  panel.webview.postMessage(message);

  panel.onDidDispose(() => {
    delete context.panels[name];
  });
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
