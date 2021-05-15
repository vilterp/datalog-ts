import { Rec, BinExpr, VarMappings, Rule, Res } from "../types";
import { ppb, ppBE, ppt, ppVM } from "../pretty";
import { EmissionLog } from "./eval";
import { List, Map } from "immutable";
import { IndexedCollection } from "./indexedCollection";

export type NodeID = string;

export type RuleGraph = {
  nextNodeID: number;
  tables: string[];
  rules: Rule[];
  nodes: Map<NodeID, NodeAndCache>;
  edges: Map<NodeID, List<NodeID>>;
  unmappedRules: {
    [name: string]: { rule: Rule; newNodeIDs: Set<NodeID> };
  };
};

type NodeAndCache = {
  isInternal: boolean;
  desc: NodeDesc;
  cache: IndexedCollection<Res>;
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

export type NodeDesc =
  | { type: "BaseFactTable" }
  | JoinDesc
  | { type: "Match"; rec: Rec; mappings: VarMappings }
  | { type: "Substitute"; rec: Rec }
  | { type: "BinExpr"; expr: BinExpr }
  | { type: "Union" };

export const emptyRuleGraph: RuleGraph = {
  tables: [],
  rules: [],
  nextNodeID: 0,
  nodes: Map(),
  edges: Map(),
  unmappedRules: {},
};

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
