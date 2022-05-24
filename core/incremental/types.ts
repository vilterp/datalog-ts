import { Rec, VarMappings, Rule, Res } from "../types";
import { EmissionLog } from "./eval";
import { List, Map } from "immutable";
import { IndexedCollection } from "../../util/indexedCollection";

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

export type JoinDesc = {
  type: "Join";
  joinVars: string[];
  leftID: NodeID;
  rightID: NodeID;
};

export type NodeDesc =
  | JoinDesc
  | { type: "BaseFactTable" }
  | { type: "Match"; rec: Rec; mappings: VarMappings }
  | { type: "Substitute"; rec: Rec }
  | { type: "Union" }
  | { type: "Builtin"; rec: Rec };

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
