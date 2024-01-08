import { Rec } from "../../../core/types";
import { Span } from "../../parserlib/types";
import { DL2Rule } from "./parser";

export type ExtractionProblem =
  | {
      type: "DuplicateTable";
      name: string;
      span: Span;
    }
  | { type: "DuplicateRule"; name: string; span: Span }
  | { type: "DuplicateImport"; name: string; span: Span }
  | { type: "DuplicateTableMember"; name: string; span: Span }
  | { type: "MissingRefSpec"; name: string; relation: string; span: Span }
  | { type: "MissingTableDecl"; name: string; span: Span };

export type Workspace = {
  [file: string]: Module;
};

export type Module = {
  imports: Set<string>;
  tableDecls: { [name: string]: TableDecl };
  ruleDecls: { [name: string]: DL2Rule };
};

export type TableDecl = {
  members: TableMembers;
  facts: Rec[];
};

export type TableMembers = {
  [name: string]: TableMember;
};

export type TableMember =
  | { type: "Scalar" }
  | { type: "InRef"; table: string; name: string }
  | { type: "OutRef"; table: string; name: string };
