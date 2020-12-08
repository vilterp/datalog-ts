import { Term, Rec, BinExpr, Bindings, VarMappings, Rule } from "../types";
import { ppb, ppBE, ppt, ppVM } from "../pretty";
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

export type AttrName = string;

export type AttrPath = AttrName[];

export type JoinInfo = {
  [varName: string]: {
    varName: string;
    leftAttr: AttrPath;
    rightAttr: AttrPath;
  };
};

export type ColsToIndexByRelation = {
  left: AttrPath[];
  right: AttrPath[];
};

export type JoinDesc = {
  type: "Join";
  ruleName: string;
  joinInfo: JoinInfo;
  indexes: ColsToIndexByRelation;
  leftID: NodeID;
  rightID: NodeID;
};

export type MatchDesc = {
  type: "Match";
  rec: Rec;
  mappings: VarMappings;
};

export type NodeDesc =
  | { type: "BaseFactTable" }
  | JoinDesc
  | MatchDesc
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
        return `Join(${nodeDesc.leftID} & ${nodeDesc.rightID}): ${nodeDesc.ruleName}`;
      case "Match":
        return `Match(${ppt(nodeDesc.rec)}; ${ppVM(nodeDesc.mappings, [], {
          showScopePath: false,
        })})`;
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
