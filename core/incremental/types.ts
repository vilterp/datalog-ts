import {
  Rec,
  Res,
  Aggregation,
  BindingsWithTrace,
  AttrPath,
  Term,
  Bindings,
} from "../types";
import { List, Map, Set } from "immutable";
import { IndexedCollection } from "../../util/indexedCollection";

export type NodeID = string;

export type RuleGraph = {
  nextNodeID: number;
  currentEpoch: number;
  builtins: Set<NodeID>;
  nodes: Map<NodeID, NodeAndCache>;
  edges: Map<NodeID, List<NodeID>>;
};

export type NodeAndCache = {
  isInternal: boolean;
  desc: NodeDesc;
  epochDone: number;
  cache: IndexedCollection<Res>;
};

export type JoinInfo = {
  [varName: string]: {
    varName: string;
    leftAttr: AttrPath;
    rightAttr: AttrPath;
  };
};

export type NodeDesc =
  | JoinDesc
  | { type: "BaseFactTable" }
  | { type: "Match"; rec: Rec }
  | { type: "Substitute"; rec: Rec }
  | { type: "Union" }
  | { type: "Builtin"; rec: Rec }
  // TODO: maybe operator state should be kept separate?
  // Negation aka AntiJoin
  | NegationDesc
  | { type: "Aggregation"; aggregation: Aggregation; state: AggregationState };

export type JoinDesc = {
  type: "Join";
  joinVars: Set<string>;
  leftID: NodeID;
  rightID: NodeID;
};

export type NegationDesc = {
  type: "Negation";
  joinDesc: JoinDesc;
  state: NegationState;
};

export type NegationState = {
  receivedNormal: BindingsWithTrace[];
  receivedNegated: BindingsWithTrace[];
};

export const emptyNegationState: NegationState = {
  receivedNormal: [],
  receivedNegated: [],
};

// key: pretty print of bindings
export type AggregationState = Map<Term[], Term>;

export const emptyAggregationState: AggregationState = Map();

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  currentEpoch: 0,
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

export const markDone: MarkDoneMsg = { type: "MarkDone" };

// output

export type Output =
  | { type: "EmissionLog"; log: EmissionLog }
  | { type: "Trace"; logAndGraph: EmissionLogAndGraph }
  | { type: "QueryResults"; results: Res[] }
  | { type: "Acknowledge" };

export const ack: Output = { type: "Acknowledge" };

export type EmissionLog = EmissionBatch[];

export type EmissionBatch = { fromID: NodeID; output: MessagePayload[] };

export type EmissionLogAndGraph = {
  graph: RuleGraph;
  log: EmissionLog;
};
