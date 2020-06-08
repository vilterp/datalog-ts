export interface DB {
  tables: { [name: string]: Rec[] };
  rules: { [name: string]: Rule };
}

export function newDB(): DB {
  return {
    rules: {},
    tables: {},
  };
}

export interface Res {
  term: Term;
  bindings: Bindings;
  trace: Trace;
}

export type Trace =
  | { type: "AndTrace"; sources: Res[] }
  | { type: "MatchTrace"; fact: Res; match: Rec }
  | { type: "RefTrace"; ruleName: string; innerRes: Res }
  | { type: "BaseFactTrace" }
  | { type: "LiteralTrace" }
  | { type: "VarTrace" }
  | { type: "BinExprTrace" };

export const literalTrace: Trace = { type: "LiteralTrace" };

export const varTrace: Trace = { type: "VarTrace" };

export const baseFactTrace: Trace = { type: "BaseFactTrace" };

export const binExprTrace: Trace = { type: "BinExprTrace" };

export type Bindings = { [key: string]: Term };

export type Program = Statement[];

export type Statement =
  | { type: "Rule"; rule: Rule }
  | { type: "Insert"; record: Rec }
  | { type: "TableDecl"; name: string }
  | { type: "LoadStmt"; path: string };

export interface Rule {
  // should maybe be an Or of multiple (head, And[]) pairs
  head: Rec;
  defn: OrExpr;
}

export type OrExpr = { type: "Or"; opts: AndExpr[] };

export type AndExpr = { type: "And"; clauses: AndClause[] };

export type Term = StringLit | Var | AndClause | Bool | Int | Array;

export type AndClause = Rec | BinExpr;

export type Var = { type: "Var"; name: string };

export type Rec = {
  type: "Record";
  relation: string;
  attrs: { [key: string]: Term };
};

export type BinExpr = {
  type: "BinExpr";
  left: Term;
  right: Term;
  op: Operator;
};

export type Bool = { type: "Bool"; val: boolean };

export type Int = { type: "IntLit"; val: number };

export type StringLit = { type: "StringLit"; val: string };

export type Array = { type: "Array"; items: Term[] };

// TODO: moar, argument types, etc.
export type Operator = "=" | "!=";

// term helpers

export function str(s: string): StringLit {
  return { type: "StringLit", val: s };
}

export function int(i: number): Int {
  return { type: "IntLit", val: i };
}

export function rec(relation: string, attrs: { [key: string]: Term }): Rec {
  return { type: "Record", relation, attrs };
}

export function varr(name: string): Var {
  return { type: "Var", name: name };
}

export function binExpr(left: Term, op: Operator, right: Term): BinExpr {
  return { type: "BinExpr", left, right, op };
}

export function array(items: Term[]): Array {
  return { type: "Array", items: items };
}

export const trueTerm: Term = { type: "Bool", val: true };

export const falseTerm: Term = { type: "Bool", val: false };

export type VarMappings = { [from: string]: string };
