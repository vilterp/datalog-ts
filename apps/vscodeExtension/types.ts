import * as vscode from "vscode";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Res } from "../../core/types";

export type PanelRegistry = { [relationName: string]: vscode.WebviewPanel };

export type Context = {
  interp: AbstractInterpreter;
  panels: PanelRegistry;
  vscodeContext: vscode.ExtensionContext;
};

export type MessageToWebView =
  | {
      type: "Relation";
      relation: string;
      results: Res[];
    }
  | { type: "Visualization"; name: string; results: Res[] };
