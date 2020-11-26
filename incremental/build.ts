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
    type: "Substitute",
    rec: rule.head,
  });
  return addEdge(withMatch, orID, { nodeID: matchID });
}

function addOr(graph: RuleGraph, or: OrExpr): [RuleGraph, NodeID] {
  const [g1, orID] = addNode(graph, { type: "Union" });
  const withAndAndEdges = or.opts.reduce((curG, andExpr) => {
    const [withAnd, andID] = addAnd(curG, andExpr.clauses);
    return addEdge(withAnd, andID, { nodeID: orID });
  }, g1);
  return [withAndAndEdges, orID];
}

function addAnd(graph: RuleGraph, and: AndTerm[]): [RuleGraph, NodeID] {
  if (and.length === 0) {
    throw new Error("empty and");
  }
  if (and.length === 1) {
    const [newGraph, id] = addTerm(graph, and[0]);
    return [newGraph, id];
  }
  const [g1, rightID] = addAnd(graph, and.slice(1));
  return addAndBinary(g1, and[0], rightID);
}

function addAndBinary(
  graph: RuleGraph,
  left: AndTerm,
  rightID: NodeID
): [RuleGraph, NodeID] {
  // TODO: identify common vars
  if (left.type !== "Record") {
    throw new Error("incremental doesn't support BinExprs yet");
  }
  const [g1, leftID] = addTerm(graph, left);
  const [g2, joinID] = addNode(g1, {
    type: "Join",
    leftID,
    rightID,
  });
  const g3 = addEdge(g2, leftID, { nodeID: joinID, joinSide: "left" });
  const g4 = addEdge(g3, rightID, { nodeID: joinID, joinSide: "right" });
  return [g4, joinID];
}

type AndTerm = Rec | BinExpr;

function addTerm(graph: RuleGraph, term: AndTerm): [RuleGraph, NodeID] {
  switch (term.type) {
    case "BinExpr":
      return addNode(graph, { type: "BinExpr", expr: term });
    case "Record":
      const [withMatch, matchID] = addNode(graph, {
        type: "Match",
        rec: term,
      });
      const withMatchEdge = addEdge(withMatch, term.relation, {
        nodeID: matchID,
      });
      return [withMatchEdge, matchID];
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
