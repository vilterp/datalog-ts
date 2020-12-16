import { Term, Rec, BinExpr, Bindings, VarMappings } from "../types";
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

export type VarToPath = { [varName: string]: AttrPath };

export type JoinInfo = {
  leftVars: VarToPath;
  rightVars: VarToPath;
  join: {
    [varName: string]: {
      varName: string;
      leftAttr: AttrPath;
      rightAttr: AttrPath;
    };
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

export function ppr(res: Res): string {
  return `${ppt(res.term)}; ${ppb(res.bindings || {})}`;
}

export type AddResult = {
  newNodeIDs: Set<NodeID>;
  rec: Rec;
  tipID: NodeID;
};

export type Insertion = {
  res: Res;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type EmissionLog = EmissionBatch[];

export type EmissionBatch = { insertion: Insertion; output: Res[] };
