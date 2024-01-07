import { DL2Rule, DL2TableDecl } from "./parser";

export type Workspace = {
  [file: string]: Module;
};

export type Module = {
  imports: string[];
  tableDecls: DL2TableDecl[];
  ruleDecls: DL2Rule[];
};
