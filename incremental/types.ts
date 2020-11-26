import { Term, Rec, BinExpr, Bindings } from "../types";

export type NodeID = string;

export type EdgeDestination = { nodeID: string; joinSide?: "left" | "right" };

export type RuleGraph = {
  nextNodeID: number;
  nodes: {
    [nodeID: string]: {
      desc: NodeDesc;
      cache: { term: Term; bindings: Bindings }[];
    };
  };
  edges: { [fromID: string]: EdgeDestination[] };
};

export type NodeDesc =
  | { type: "BaseFactTable"; name: string }
  | { type: "Join"; leftSide: Rec; rightSide: Rec }
  | { type: "Match"; rec: Rec }
  | { type: "Substitute"; rec: Rec } // TODO: need mappings?
  | { type: "BinExpr"; expr: BinExpr }
  | { type: "Union" };

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  nodes: {},
  edges: {},
};
