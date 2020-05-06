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
  trace?: Trace;
}

type Trace =
  | { type: "AndTrace"; left: Res; right: Res }
  | {
      type: "CallTrace";
      ruleName: string;
      mappings: VarMappings;
      inner: Res;
    }
  | { type: "MatchTrace"; record: Rec; inner: Res };

export type Bindings = { [key: string]: Term };

export type Program = Statement[];

export type Statement =
  | { type: "Rule"; rule: Rule }
  | { type: "Insert"; record: Rec };

export interface Rule {
  // should maybe be an Or of multiple (head, And[]) pairs
  head: Rec;
  defn: OrExpr;
}

export type OrExpr = { type: "Or"; opts: AndExpr[] };

export type AndExpr = { type: "And"; clauses: AndClause[] };

export type Term = StringLit | Var | AndClause | Bool | Int;

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

type Bool = { type: "Bool"; val: boolean };

type Int = { type: "IntLit"; val: number };

export type StringLit = { type: "StringLit"; val: string };

// TODO: moar, argument types, etc.
export type Operator = "=" | "!=";

// term helpers

export function str(s: string): Term {
  return { type: "StringLit", val: s };
}

export function int(i: number): Term {
  return { type: "IntLit", val: i };
}

export function rec(relation: string, attrs: { [key: string]: Term }): Rec {
  return { type: "Record", relation, attrs };
}

export function varr(name: string): Term {
  return { type: "Var", name: name };
}

export function binExpr(left: Term, op: Operator, right: Term): Term {
  return { type: "BinExpr", left, right, op };
}

export const trueTerm: Term = { type: "Bool", val: true };

export const falseTerm: Term = { type: "Bool", val: false };

// plan

export interface Plan {
  rules: { [name: string]: PlanNode };
  main: string;
}

export type PlanNode =
  | { type: "Join"; left: PlanNode; right: PlanNode; template: Rec }
  | { type: "Or"; opts: PlanNode[] }
  | {
      type: "Call";
      mappings: VarMappings; // call to rule head
      ruleHead: Rec;
    }
  | { type: "Scan"; relation: string }
  | { type: "Match"; inner: PlanNode; record: Rec }
  | { type: "Filter"; expr: BinExpr; inner: PlanNode }
  | { type: "EmptyOnce" };

export type VarMappings = { [from: string]: string };
