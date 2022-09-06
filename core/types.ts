export type Statement =
  | { type: "Rule"; rule: Rule }
  | { type: "Fact"; record: Rec }
  | { type: "Query"; record: Rec }
  | { type: "Delete"; record: Rec }
  | { type: "TableDecl"; name: string }
  | { type: "LoadStmt"; path: string };

// === DB Contents ===

export type Relation =
  | { type: "Table"; name: string; columns: string[] }
  | { type: "Rule"; name: string; rule: Rule };

// === Results ===

export interface Res {
  term: Term;
  bindings: Bindings;
  trace: Trace;
}

export type Bindings = { [key: string]: Term };

// === Rules ===

export type Rule = {
  // should maybe be an Or of multiple (head, And[]) pairs
  head: Rec;
  body: Disjunction;
};

export type Disjunction = { type: "Disjunction"; disjuncts: Conjunction[] };

export type Conjunction = { type: "Conjunction"; conjuncts: Conjunct[] };

export type Conjunct = Rec | Negation | Aggregation;

type Negation = { type: "Negation"; record: Rec };

type Aggregation = {
  type: "Aggregation";
  aggregation: string;
  varNames: string[];
  record: Rec;
};

// === Terms ===

export type Term = Rec | Dict | StringLit | Var | Conjunct | Bool | Int | Array;

export type Var = { type: "Var"; name: string };

export type Rec = {
  type: "Record";
  relation: string;
  attrs: { [key: string]: Term };
};

export type Dict = {
  type: "Dict";
  map: { [key: string]: Term };
};

export type Bool = { type: "Bool"; val: boolean };

export type Int = { type: "IntLit"; val: number };

export type StringLit = { type: "StringLit"; val: string };

export type Array = { type: "Array"; items: Term[] };

// TODO: moar, argument types, etc.
export type Operator = "==" | "!=" | ">=" | "<=" | "<" | ">";

// rule helpers

export function rule(head: Rec, body: Disjunction): Rule {
  return { head, body };
}

export function or(opts: Conjunction[]): Disjunction {
  return { type: "Disjunction", disjuncts: opts };
}

export function and(clauses: Conjunct[]): Conjunction {
  return { type: "Conjunction", conjuncts: clauses };
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

export function array(items: Term[]): Array {
  return { type: "Array", items: items };
}

export function dict(map: { [key: string]: Term }): Dict {
  return { type: "Dict", map };
}

export const trueTerm: Term = { type: "Bool", val: true };

export const falseTerm: Term = { type: "Bool", val: false };

export type RelationalBool = Term[];

export function relationalBool(val: boolean): Rec[] {
  return val ? relationalTrue : relationalFalse;
}

export const relationalTrue: Rec[] = [rec("", {})];

export const relationalFalse: Rec[] = [];

// inner to outer (?)
export type VarMappings = { [from: string]: string };

// === Traces ===

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
  | { type: "AggregationTrace"; aggregatedResults: Res[] }
  | { type: "BaseFactTrace" }
  | { type: "LiteralTrace" }
  | { type: "VarTrace" };

export const literalTrace: Trace = { type: "LiteralTrace" };

export const varTrace: Trace = { type: "VarTrace" };

export const baseFactTrace: Trace = { type: "BaseFactTrace" };

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

// TODO: bindings can be at any level
export type TermWithBindings =
  | RecordWithBindings
  | ArrayWithBindings
  | DictWithBindings
  | BinExprWithBindings
  | NegationWithBindings
  | AggregationWithBindings
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

export type DictWithBindings = {
  type: "DictWithBindings";
  map: { [key: string]: TermWithBindings };
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

export type AggregationWithBindings = {
  type: "AggregationWithBindings";
  aggregation: string;
  varNames: string[];
  record: TermWithBindings;
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
