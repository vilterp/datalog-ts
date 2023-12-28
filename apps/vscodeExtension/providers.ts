import * as vscode from "vscode";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit } from "../../core/types";

class Relation extends vscode.TreeItem {
  constructor(name: string, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(name, collapsibleState);
    this.command = {
      command: "datalog-ts.openRelation",
      title: "Open Relation",
      arguments: [name],
    };
  }
}

class Visualization extends vscode.TreeItem {
  constructor(name: string, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(name, collapsibleState);
    this.command = {
      command: "datalog-ts.openVisualization",
      title: "Open Visualization",
      arguments: [name],
    };
  }
}

export class FactsProvider implements vscode.TreeDataProvider<Relation> {
  interp: AbstractInterpreter;

  constructor(interp: AbstractInterpreter) {
    this.interp = interp;
  }

  getTreeItem(element: Relation): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(): vscode.ProviderResult<Relation[]> {
    return this.interp
      .getTables()
      .map(
        (table) => new Relation(table, vscode.TreeItemCollapsibleState.None)
      );
  }
}

export class RulesProvider implements vscode.TreeDataProvider<Relation> {
  interp: AbstractInterpreter;

  constructor(interp: AbstractInterpreter) {
    this.interp = interp;
  }

  getTreeItem(element: Relation): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(): vscode.ProviderResult<Relation[]> {
    return this.interp
      .getRules()
      .map(
        (rule) =>
          new Relation(rule.head.relation, vscode.TreeItemCollapsibleState.None)
      );
  }
}

export class VisualizationsProvider
  implements vscode.TreeDataProvider<Relation>
{
  interp: AbstractInterpreter;

  constructor(interp: AbstractInterpreter) {
    this.interp = interp;
  }

  getTreeItem(element: Relation): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(): vscode.ProviderResult<Relation[]> {
    try {
      return this.interp
        .queryStr("internal.visualization{}")
        .map(
          (res) =>
            new Visualization(
              ((res.term as Rec).attrs.name as StringLit).val,
              vscode.TreeItemCollapsibleState.None
            )
        );
    } catch (e) {
      // TODO: check error
      return [];
    }
  }
}
