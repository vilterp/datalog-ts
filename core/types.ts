export type Statement =
  | { type: "Rule"; rule: Rule }
  | { type: "Fact"; record: Atom }
  | { type: "Query"; record: Atom }
  | { type: "Delete"; record: Atom }
  | { type: "TableDecl"; name: string }
  | { type: "LoadStmt"; path: string };

// === DB Contents ===

export type Relation =
  | { type: "Table"; name: string }
  | { type: "Rule"; name: string; rule: Rule };

// === Results ===

export interface Res {
  term: Value;
  bindings: Bindings;
  trace: Trace;
}

export type Bindings = { [key: string]: Value };

// === Rules ===

export type Rule = {
  // should maybe be an Or of multiple (head, And[]) pairs
  name: string; // not sure if this should be here
  body: RelationExpr;
};

// TODO: put agg back in
export type RelationExpr = AnonymousRelation;

export type AnonymousRelation = {
  type: "AnonymousRelation";
  head: Rec;
  body: Formula;
};

export type Formula =
  | Atom
  | { type: "Disjunction"; disjuncts: Formula[] }
  | { type: "Conjunction"; conjucts: Formula[] }
  | { type: "Negation"; inner: Formula };

export type Atom = {
  type: "Atom";
  relation: string;
  attrs: { [key: string]: Term };
};

type Term = Var | Value;

type Aggregation = {
  type: "Aggregation";
  aggregation: string;
  varNames: string[];
  expr: RelationExpr;
};

export type Var = { type: "Var"; name: string };

// === Values ===

export type Value = Rec | Dict | Array | StringVal | Bool | IntVal;

export type Rec = {
  type: "Record";
  attrs: { [key: string]: Value };
};

export type Dict = {
  type: "Dict";
  map: { [key: string]: Value };
};

export type Bool = { type: "Bool"; val: boolean };

export type IntVal = { type: "IntVal"; val: number };

export type StringVal = { type: "StringVal"; val: string };

export type Array = { type: "Array"; items: Value[] };

// TODO: moar, argument types, etc.
export type Operator = "==" | "!=" | ">=" | "<=" | "<" | ">";

// term helpers

export function str(val: string): StringVal {
  return { type: "StringVal", val };
}

export function int(val: number): IntVal {
  return { type: "IntVal", val };
}

export function bool(val: boolean): Bool {
  return { type: "Bool", val };
}

export function rec(attrs: { [key: string]: Value }): Rec {
  return { type: "Record", attrs };
}

export function varr(name: string): Var {
  return { type: "Var", name: name };
}

export function array(items: Value[]): Array {
  return { type: "Array", items: items };
}

export function dict(map: { [key: string]: Value }): Dict {
  return { type: "Dict", map };
}

export const trueTerm: Value = { type: "Bool", val: true };

export const falseTerm: Value = { type: "Bool", val: false };

export type RelationalBool = Value[];

export function relationalBool(val: boolean): Rec[] {
  return val ? relationalTrue : relationalFalse;
}

export const relationalTrue: Rec[] = [rec({})];

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
  | { type: "NegationTrace"; negatedTerm: Value }
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
  | { type: "Atom"; term: IntVal | Bool | StringVal | Var };

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
