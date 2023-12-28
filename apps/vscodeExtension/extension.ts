import * as vscode from "vscode";
import * as fs from "fs";
import {
  refreshDiagnostics,
  registerLanguageSupport,
} from "../../languageWorkbench/vscode/vscodeIntegration";
import * as path from "path";
import { Context } from "./types";
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
import { openRelation, openVisualization } from "./commands";

export async function activate(ctx: vscode.ExtensionContext) {
  console.log("activate!");

  [LANGUAGES.datalog, LANGUAGES.grammar, LANGUAGES.basicBlocks].forEach(
    (spec) => {
      registerLanguageSupport(spec).forEach((sub) => {
        ctx.subscriptions.push(sub);
      });
      registerDiagnosticsSupport(ctx, spec);
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

  const context: Context = {
    vscodeContext: ctx,
    interp,
    panels,
  };

  vscode.commands.registerCommand("datalog-ts.openRelation", (name: string) => {
    openRelation(context, name);
  });

  vscode.commands.registerCommand(
    "datalog-ts.openVisualization",
    (name: string) => {
      openVisualization(context, name);
    }
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
