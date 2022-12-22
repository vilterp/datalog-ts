import {
  Rec,
  Res,
  Aggregation,
  Bindings,
  Trace,
  BindingsWithTrace,
  AttrPath,
  VarToPath,
} from "../types";
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
  cache: IndexedCollection<BindingsWithTrace>;
};

export type JoinInfo = {
  [varName: string]: {
    varName: string;
    leftAttr: AttrPath;
    rightAttr: AttrPath;
  };
};

export type JoinDesc = {
  type: "Join";
  joinVars: Set<string>;
  leftID: NodeID;
  rightID: NodeID;
};

export type NodeDesc =
  | JoinDesc
  | { type: "BaseFactTable" }
  | { type: "Match"; varToPath: VarToPath }
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

export type MessagePayload = RecordMsg | BindingsMsg | MarkDoneMsg;

export type RecordMsg = {
  type: "Record";
  rec: Rec;
};

export type BindingsMsg = {
  type: "Bindings";
  bindings: BindingsWithTrace;
};

export type MarkDoneMsg = {
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
