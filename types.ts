export interface DB {
  tables: { [name: string]: Rec[] };
  rules: { [name: string]: Rule };
}

export interface Res {
  term: Term;
  bindings: Bindings;
  trace?: Trace;
}

type Trace =
  | { type: "AndTrace"; left: Res; right: Res }
  | {
      type: "ProjectTrace";
      ruleName: string;
      mappings: VarMappings;
      inner: Res;
    }
  | { type: "FilterTrace"; record: Rec; inner: Res };

export type Bindings = { [key: string]: Term };

export interface Rule {
  // should maybe be an Or of multiple (head, And[]) pairs
  head: Rec;
  defn: OrExpr;
}

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

// plan

export type PlanNode =
  | { type: "And"; left: PlanNode; right: PlanNode; template: Rec }
  | { type: "Or"; opts: PlanNode[] }
  | {
      type: "Project";
      mappings: VarMappings;
      inner: PlanNode;
      ruleName: string;
    }
  | { type: "Scan"; relation: string }
  | { type: "Filter"; inner: PlanNode; record: Rec }
  | { type: "EmptyOnce" };

export type VarMappings = { [from: string]: string };
