import { Term, Rec, BinExpr, Bindings } from "../types";
import { ppb, ppt } from "../pretty";

export type NodeID = string;

export type EdgeDestination = { nodeID: string; joinSide?: "left" | "right" };

export type Res = {
  term: Term;
  bindings: Bindings;
};

export type RuleGraph = {
  nextNodeID: number;
  nodes: {
    [nodeID: string]: {
      desc: NodeDesc;
      cache: Res[];
    };
  };
  edges: { [fromID: string]: EdgeDestination[] };
};

export type NodeDesc =
  | { type: "BaseFactTable"; name: string }
  | { type: "Join"; leftID: NodeID; rightID: NodeID } // sort of weird to have backpointers in the node
  | { type: "Match"; rec: Rec }
  | { type: "Substitute"; rec: Rec } // TODO: need mappings?
  | { type: "BinExpr"; expr: BinExpr }
  | { type: "Union" };

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  nodes: {},
  edges: {},
};

// formatters

export function formatRes(res: Res): string {
  return `${ppt(res.term)}; ${ppb(res.bindings)}`;
}
