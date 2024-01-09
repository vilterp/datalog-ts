import { Rec } from "../../../core/types";
import { ParseError, Span } from "../../parserlib/types";
import { DL2Rule } from "./parser";

export type ExtractionProblem =
  | { type: "ParseError"; parseError: ParseError }
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

export type TableMember = { type: "Scalar" } | RefSpec;

export type RefSpec =
  | { type: "InRef"; table: string; column: string }
  | { type: "OutRef"; table: string; column: string };
