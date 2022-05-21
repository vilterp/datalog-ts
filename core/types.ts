export type Relation =
  | { type: "Table"; name: string }
  | { type: "Rule"; name: string; rule: Rule };

export interface Res {
  term: Term;
  bindings: Bindings;
  trace: Trace;
}

// traces

export type Trace =
  | { type: "AndTrace"; sources: Res[] }
  | { type: "MatchTrace"; fact: Res; match: Rec } // TODO: fact isn't used, since it's always just baseFact
  | {
      type: "RefTrace";
      refTerm: Rec;
      invokeLoc: InvocationLocation; // where in the calling rule this was
      innerRes: Res;
      mappings: VarMappings;
    }
  | { type: "NegationTrace"; negatedTerm: Term }
  | { type: "AggregationTrace"; aggregatedRecords: Rec[] }
  | { type: "BaseFactTrace" }
  | { type: "LiteralTrace" }
  | { type: "VarTrace" }
  | { type: "BinExprTrace" };

export const literalTrace: Trace = { type: "LiteralTrace" };

export const varTrace: Trace = { type: "VarTrace" };

export const baseFactTrace: Trace = { type: "BaseFactTrace" };

export const binExprTrace: Trace = { type: "BinExprTrace" };

export type InvocationLocation = RulePathSegment[];

export type RulePathSegment =
  | { type: "OrOpt"; idx: number }
  | { type: "AndClause"; idx: number }
  | { type: "Negation" }
  | { type: "Aggregation" };

export type ScopePath = { name: string; invokeLoc: InvocationLocation }[];

// gah this should be derived by the language
export function scopePathEq(left: ScopePath, right: ScopePath): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export type Bindings = { [key: string]: Term };

export type Program = Statement[];

export type Statement =
  | { type: "Rule"; rule: Rule }
  | { type: "Query"; record: Rec }
  | { type: "Insert"; record: Rec }
  | { type: "TableDecl"; name: string }
  | { type: "LoadStmt"; path: string }
  | { type: "Comment"; comment: string };

export interface Rule {
  // should maybe be an Or of multiple (head, And[]) pairs
  head: Rec;
  body: OrExpr;
}

export type OrExpr = { type: "Or"; opts: AndExpr[] };

export type AndExpr = { type: "And"; clauses: AndClause[] };

export type AndClause = Rec | BinExpr | Negation | Aggregation;

type Negation = { type: "Negation"; record: Rec };

type Aggregation = {
  type: "Aggregation";
  aggregation: string;
  var: string;
  record: Rec;
};

export type Term = Rec | StringLit | Var | AndClause | Bool | Int | Array;

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
export type Operator = "==" | "!=" | ">=" | "<=" | "<" | ">";

// rule helpers

export function rule(head: Rec, body: OrExpr): Rule {
  return { head, body };
}

export function or(opts: AndExpr[]): OrExpr {
  return { type: "Or", opts };
}

export function and(clauses: AndClause[]): AndExpr {
  return { type: "And", clauses };
}

// term helpers

export function str(val: string): StringLit {
  return { type: "StringLit", val };
}

export function int(val: number): Int {
  return { type: "IntLit", val };
}

export function bool(val: boolean): Bool {
  return { type: "Bool", val };
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

export type RelationalBool = Term[];

export const relationalTrue: Term[] = [rec("", {})];

export const relationalFalse: Term[] = [];

// inner to outer (?)
export type VarMappings = { [from: string]: string };

// TODO: bindings can be at any level
export type TermWithBindings =
  | RecordWithBindings
  | ArrayWithBindings
  | BinExprWithBindings
  | NegationWithBindings
  | { type: "Atom"; term: Int | Bool | StringLit | Var };

export type RecordWithBindings = {
  type: "RecordWithBindings";
  relation: string;
  attrs: {
    [key: string]: { term: TermWithBindings; binding: string | undefined };
  };
};

export type ArrayWithBindings = {
  type: "ArrayWithBindings";
  items: TermWithBindings[];
};

export type BinExprWithBindings = {
  type: "BinExprWithBindings";
  left: TermWithBindings;
  right: TermWithBindings;
  op: Operator;
};

export type NegationWithBindings = {
  type: "NegationWithBindings";
  inner: TermWithBindings;
};

export type SituatedBinding = {
  name: string;
  path: ScopePath;
};

// probably shouldn't be using errors at all,
// but at least differentiate our errors from
// other JS runtime errors.
export class UserError extends Error {
  constructor(message: string) {
    super(message);
  }
}
