import { Term, Rec, BinExpr, Bindings, VarMappings, Rule } from "../types";
import { ppb, ppBE, ppt, ppVM } from "../pretty";
import { EmissionLog } from "./eval";
import { List, Map } from "immutable";
import { IndexedCollection } from "./indexedCollection";
import { RuleGraph } from "./ruleGraph";

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

export type JoinInfo = {
  [varName: string]: {
    varName: string;
    leftAttr: string;
    rightAttr: string;
  };
};

export type ColsToIndexByRelation = {
  left: string[];
  right: string[];
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

export type EmissionLogAndGraph = {
  graph: RuleGraph;
  log: EmissionLog;
};

export type AddResult = {
  newNodeIDs: Set<NodeID>;
  tipID: NodeID;
};
