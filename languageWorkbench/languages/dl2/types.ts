import { DL2Rule } from "./parser";

export type Workspace = {
  [file: string]: Module;
};

export type Module = {
  imports: Set<string>;
  tableDecls: { [name: string]: TableMembers };
  ruleDecls: { [name: string]: DL2Rule };
};

export type TableMembers = {
  [name: string]: TableMember;
};

export type TableMember =
  | { type: "Scalar" }
  | { type: "InRef"; table: string; name: string }
  | { type: "OutRef"; table: string; name: string };
