import { Term, Rec, BinExpr, Bindings, VarMappings, Rule } from "../types";
import { ppb, ppBE, ppRule, ppt, ppVM } from "../pretty";
import { IndexedCollection } from "./indexedCollection";

export type NodeID = string;

// TODO: dedup with ../types.Res when we have traces
export type Res = {
  term: Term;
  bindings: Bindings | null;
};

export type NodeAndCache = {
  isInternal: boolean;
  desc: NodeDesc;
  cache: IndexedCollection<Res>; // TODO: should this be just Rec?
};

export type ColName = string;

export type JoinVars = {
  // TODO: support nested records & arrays...
  [varname: string]: ColName;
};

export type JoinClause = {
  rec: Rec;
  joinVars: JoinVars;
  colsToIndex: string[];
  indexName: string;
};

export type JoinDesc = {
  type: "Join";
  head: Rec;
  joinClauses: JoinClause[];
};

export type NodeDesc =
  | { type: "BaseFactTable" }
  | JoinDesc
  | { type: "Substitute"; rec: Rec }
  | { type: "BinExpr"; expr: BinExpr }
  | { type: "Union" };

// formatters

export function formatRes(res: Res): string {
  return `${ppt(res.term)}; ${ppb(res.bindings || {})}`;
}

export function formatDesc(node: NodeAndCache): string {
  const nodeDesc = node.desc;
  const mainRes = (() => {
    switch (nodeDesc.type) {
      case "BaseFactTable":
        return `Base`;
      case "BinExpr":
        return ppBE(nodeDesc.expr);
      case "Join":
        return `Join(${ppt(
          nodeDesc.head
        )} :- ${nodeDesc.joinClauses
          .map((clause) => ppt(clause.rec))
          .join(" & ")})`;
      case "Substitute":
        return `Subst(${ppt(nodeDesc.rec)})`;
      case "Union":
        return "Union";
    }
  })();
  return `${mainRes} [${node.cache.indexNames().join(", ")}]`;
}

export type AddResult = {
  newNodeIDs: Set<NodeID>;
  tipID: NodeID;
};

export type Insertion = {
  res: Res;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type EmissionLog = EmissionBatch[];

export type EmissionBatch = { fromID: NodeID; output: Res[] };
