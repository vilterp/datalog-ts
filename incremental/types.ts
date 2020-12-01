import { Term, Rec, BinExpr, Bindings, VarMappings, Rule } from "../types";
import { ppb, ppBE, ppt, ppVM } from "../pretty";
import { EmissionLog } from "./eval";
import { List, Map } from "immutable";

export type NodeID = string;

// TODO: dedup with ../types.Res when we have traces
export type Res = {
  term: Term;
  bindings: Bindings | null;
};

export type RuleGraph = {
  nextNodeID: number;
  nodes: Map<
    NodeID,
    {
      isInternal: boolean;
      desc: NodeDesc;
      cache: List<Res>;
    }
  >;
  edges: { [fromID: string]: NodeID[] };
  unmappedRules: {
    [name: string]: { rule: Rule; newNodeIDs: Set<NodeID> };
  };
};

export type NodeDesc =
  | { type: "BaseFactTable" }
  | { type: "Join"; ruleName: string; leftID: NodeID; rightID: NodeID }
  | { type: "Match"; rec: Rec; mappings: VarMappings }
  | { type: "Substitute"; rec: Rec }
  | { type: "BinExpr"; expr: BinExpr }
  | { type: "Union" };

export const emptyRuleGraph: RuleGraph = {
  nextNodeID: 0,
  nodes: Map(),
  edges: {},
  unmappedRules: {},
};

// formatters

export function formatRes(res: Res): string {
  return `${ppt(res.term)}; ${ppb(res.bindings || {})}`;
}

export function formatDesc(node: NodeDesc): string {
  switch (node.type) {
    case "BaseFactTable":
      return `Base`;
    case "BinExpr":
      return ppBE(node.expr);
    case "Join":
      return `Join(${node.leftID} & ${node.rightID}): ${node.ruleName}`;
    case "Match":
      return `Match(${ppt(node.rec)}; ${ppVM(node.mappings, [], {
        showScopePath: false,
      })})`;
    case "Substitute":
      return `Subst(${ppt(node.rec)})`;
    case "Union":
      return "Union";
  }
}

export type EmissionLogAndGraph = {
  graph: RuleGraph;
  log: EmissionLog;
};
