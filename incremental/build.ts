import { Rule, Rec, OrExpr, BinExpr, Term } from "../types";
import { RuleGraph, NodeDesc, NodeID, EdgeDestination } from "./types";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  return addNodeKnownID(name, graph, { type: "BaseFactTable", name });
}

export function addRule(graph: RuleGraph, rule: Rule): RuleGraph {
  // TODO: compute cache for this rule when we add it
  const matchID = rule.head.relation;
  const [withOr, orID] = addOr(graph, rule.defn);
  const withMatch = addNodeKnownID(matchID, withOr, {
    type: "Match",
    rec: rule.head,
  });
  return addEdge(withMatch, orID, { toID: matchID });
}

function addOr(graph: RuleGraph, or: OrExpr): [RuleGraph, NodeID] {
  const [g1, orID] = addNode(graph, { type: "Union" });
  const withAndAndEdges = or.opts.reduce((curG, andExpr) => {
    const [withAnd, _, andID] = addAnd(curG, andExpr.clauses);
    return addEdge(withAnd, andID, { toID: orID });
  }, g1);
  return [withAndAndEdges, orID];
}

function addAnd(graph: RuleGraph, and: AndTerm[]): [RuleGraph, Term, NodeID] {
  if (and.length === 0) {
    throw new Error("empty and");
  }
  if (and.length === 1) {
    const [newGraph, id] = addTerm(graph, and[0]);
    return [newGraph, and[0], id];
  }
  const [g1, rightTerm, rightID] = addAnd(graph, and.slice(1));
  return addAndBinary(g1, and[0], rightTerm, rightID);
}

function addAndBinary(
  graph: RuleGraph,
  left: AndTerm,
  right: Term,
  rightID: NodeID
): [RuleGraph, Term, NodeID] {
  // TODO: identify common vars
  if (left.type !== "Record") {
    throw new Error("incremental doesn't support BinExprs yet");
  }
  if (right.type !== "Record") {
    throw new Error("incremental doesn't support BinExprs yet");
  }
  const [g1, joinID] = addNode(graph, {
    type: "Join",
    leftSide: left,
    rightSide: right,
  });
  const [g2, leftID] = addTerm(g1, left);
  const g3 = addEdge(g2, leftID, { toID: joinID, joinSide: "left" });
  const g4 = addEdge(g3, rightID, { toID: joinID, joinSide: "right" });
  return [g4, right, joinID];
}

type AndTerm = Rec | BinExpr;

function addTerm(graph: RuleGraph, term: AndTerm): [RuleGraph, NodeID] {
  switch (term.type) {
    case "BinExpr":
      return addNode(graph, { type: "BinExpr", expr: term });
    case "Record":
      // TODO: match?
      return [graph, term.relation];
  }
}

// helpers

function addNodeKnownID(
  id: NodeID,
  graph: RuleGraph,
  desc: NodeDesc
): RuleGraph {
  return { ...graph, nodes: { ...graph.nodes, [id]: { desc, cache: [] } } };
}

function addNode(graph: RuleGraph, desc: NodeDesc): [RuleGraph, NodeID] {
  return [
    {
      ...graph,
      nextNodeID: graph.nextNodeID + 1,
      nodes: { ...graph.nodes, [graph.nextNodeID]: { desc, cache: [] } },
    },
    `${graph.nextNodeID}`,
  ];
}

function addEdge(
  graph: RuleGraph,
  from: NodeID,
  to: EdgeDestination
): RuleGraph {
  return {
    ...graph,
    edges: { ...graph.edges, [from]: [...(graph.edges[from] || []), to] },
  };
}
