import { Rec, VarMappings, Rule, Res, Aggregation } from "../types";
import { EmissionLog } from "./eval";
import { List, Map, Set } from "immutable";
import { IndexedCollection } from "../../util/indexedCollection";

export type NodeID = string;

export type RuleGraph = {
  nextNodeID: number;
  builtins: Set<NodeID>;
  nodes: Map<NodeID, NodeAndCache>;
  edges: Map<NodeID, List<NodeID>>;
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
  // TODO: do leftVars and rightVars need to be here?
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
  | { type: "Builtin"; rec: Rec }
  // TODO: maybe operator state should be kept separate?
  // Negation aka AntiJoin
  | { type: "Negation"; joinDesc: JoinDesc; received: number }
  | { type: "Aggregation"; aggregation: Aggregation };

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  builtins: Set(),
  nodes: Map(),
  edges: Map(),
};

// eval

export type Message = {
  payload: MessagePayload;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type MessagePayload = Insert | MarkDone;

export type Insert = {
  type: "Insert";
  res: Res;
};

export type MarkDone = {
  type: "MarkDone";
};

// output

export type Output =
  | { type: "EmissionLog"; log: EmissionLog }
  | { type: "Trace"; logAndGraph: EmissionLogAndGraph }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

export const ack: Output = { type: "Acknowledge" };

export type EmissionLogAndGraph = {
  graph: RuleGraph;
  log: EmissionLog;
};
