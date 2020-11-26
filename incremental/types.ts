import { Term, Rec, BinExpr } from "../types";

export type NodeID = string;

export type EdgeDestination = { toID: string; joinSide?: "left" | "right" };

export type RuleGraph = {
  nextNodeID: number;
  nodes: {
    [nodeID: string]: { desc: NodeDesc; cache: Term[] };
  };
  edges: { [fromID: string]: EdgeDestination[] };
};

export type NodeDesc =
  | { type: "BaseFactTable"; name: string }
  | { type: "Join"; leftSide: Rec; rightSide: Rec }
  | { type: "Match"; rec: Rec } // TODO: mappings?
  | { type: "BinExpr"; expr: BinExpr }
  | { type: "Union" };

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  nodes: {},
  edges: {},
};
