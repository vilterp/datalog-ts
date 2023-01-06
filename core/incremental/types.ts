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
import { IndexedMultiSet } from "./indexedMultiSet";

export type NodeID = string;

export type RuleGraph = {
  nextNodeID: number;
  builtins: Set<NodeID>;
  nodes: Map<NodeID, NodeAndCache>;
  edges: Map<NodeID, List<NodeID>>;
};

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  builtins: Set(),
  nodes: Map(),
  edges: Map(),
};

export type NodeAndCache = {
  isInternal: boolean;
  desc: NodeDesc;
  epochDone: number;
  cache: IndexedMultiSet<Res>;
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
  | MatchDesc
  | SubstituteDesc
  | AggregationDesc
  | { type: "Distinct" }
  | { type: "Negation" }
  | { type: "BaseFactTable" }
  | { type: "Union" }
  | { type: "Builtin"; rec: Rec };

export type MatchDesc = { type: "Match"; rec: Rec };

export type SubstituteDesc = { type: "Substitute"; rec: Rec };

export type JoinDesc = {
  type: "Join";
  joinVars: Set<string>;
  leftID: NodeID;
  rightID: NodeID;
};

// key: pretty print of bindings

export type AggregationDesc = {
  type: "Aggregation";
  aggregation: Aggregation;
  state: AggregationState;
};

export type AggregationState = Map<string, Term>;

export const emptyAggregationState: AggregationState = Map();

// eval

export type Message = {
  payload: MessagePayload;
  origin: NodeID | null; // null if coming from outside
  destination: NodeID;
};

export type MessagePayload = {
  data: RecordMsg | BindingsMsg;
  multiplicity: number;
};

export type RecordMsg = {
  type: "Record";
  rec: Rec;
};

export type BindingsMsg = {
  type: "Bindings";
  bindings: BindingsWithTrace;
};

export type BindingsWithMultiplicity = {
  bindings: BindingsWithTrace;
  multiplicity: number;
};

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
