import { DL2Rule, DL2TableDecl } from "./parser";

export type Workspace = {
  [file: string]: Module;
};

export type Module = {
  imports: Set<string>;
  tableDecls: { [name: string]: DL2TableDecl };
  ruleDecls: { [name: string]: DL2Rule };
};
