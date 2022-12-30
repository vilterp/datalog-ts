import {
  Rec,
  Res,
  Aggregation,
  BindingsWithTrace,
  AttrPath,
  Term,
  Bindings,
} from "../types";
import { List, Set } from "immutable";
import { IndexedMultiSet } from "./indexedMultiSet";
import { DefaultDict } from "../../util/defaultDict";

export type NodeID = string;

export type RuleGraph = {
  nextNodeID: number;
  builtins: Set<NodeID>;
  nodes: DefaultDict<NodeID, NodeAndCache>;
  edges: DefaultDict<NodeID, NodeID[]>;
};

export function emptyRuleGraph(): RuleGraph {
  return {
    nextNodeID: 0,
    builtins: Set(),
    nodes: new DefaultDict<NodeID, NodeAndCache>(() => {
      throw new Error("bloop");
    }),
    edges: new DefaultDict<NodeID, NodeID[]>(() => {
      throw new Error("bloop");
    }),
  };
}

export type NodeAndCache = {
  isInternal: boolean;
  desc: NodeDesc;
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
  | DistinctDesc
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

export type DistinctDesc = {
  type: "Distinct";
  state: IndexedMultiSet<Bindings>;
};

// key: pretty print of bindings

export type AggregationDesc = {
  type: "Aggregation";
  aggregation: Aggregation;
  state: AggregationState;
};

export type AggregationState = DefaultDict<string, Term>;

export const emptyAggregationState: AggregationState = new DefaultDict<
  string,
  Term
>(() => {
  throw new Error("bloop");
});

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
