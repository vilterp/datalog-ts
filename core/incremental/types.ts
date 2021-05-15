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

export type NodeAndCache = {
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
  joinVars: string[];
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

export type EmissionLogAndGraph = {
  graph: RuleGraph;
  log: EmissionLog;
};
