export type DB = {
  [relation: string]: Rec[] | Rule; // TODO: indexes
};

export type Res = { term: Term; bindings: Bindings };

export type Bindings = { [key: string]: Term };

export type Rule = {
  // should maybe be an Or of multiple (head, And[]) pairs
  head: Rec;
  defn: OrExpr;
};

export type OrExpr = { type: "Or"; opts: AndExpr[] };

export type AndExpr = { type: "And"; clauses: Rec[] };

export type Term =
  | { type: "StringLit"; val: string }
  | { type: "Var"; name: string }
  | Rec;

export type Rec = {
  type: "Record";
  relation: string;
  attrs: { [key: string]: Term };
};

// term helpers

export function str(s: string): Term {
  return { type: "StringLit", val: s };
}

export function rec(relation: string, attrs: { [key: string]: Term }): Rec {
  return { type: "Record", relation, attrs };
}

export function varr(name: string): Term {
  return { type: "Var", name: name };
}

// plan spec

export type PlanSpec =
  | { type: "And"; left: PlanSpec; right: PlanSpec }
  | { type: "Or"; opts: PlanSpec[] }
  | { type: "Scan"; relation: string }
  | { type: "Filter"; inner: PlanSpec; record: Rec }
  | { type: "EmptyOnce" };
