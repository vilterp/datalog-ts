import { Term, Rec, BinExpr } from "../types";

export type NodeID = string;

export type RuleGraph = {
  nextNodeID: number;
  nodes: {
    [nodeID: string]: { node: NodeDesc; cache: Term[] };
  };
  edges: { [fromID: string]: string[] };
  relationRefs: { [name: string]: NodeID };
};

export type NodeDesc =
  | { type: "BaseFactTable" }
  | { type: "Join"; leftAttr: string; rightAttr: string }
  | { type: "Match"; rec: Rec } // TODO: mappings?
  | { type: "BinExpr"; expr: BinExpr }
  | { type: "Union" };

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  nodes: {},
  edges: {},
  relationRefs: {},
};
