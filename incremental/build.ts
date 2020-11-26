import { Rule, Rec, OrExpr, BinExpr } from "../types";
import { RuleGraph, NodeDesc, NodeID, EdgeDestination } from "./types";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  return addNodeKnownID(graph, { type: "BaseFactTable", name }, name);
}

export function addRule(graph: RuleGraph, rule: Rule): RuleGraph {
  const orID = rule.head.relation;
  const g1 = addOr(orID, graph, rule.defn);
  // TODO: what about matches
  return g1;
}

function addOr(orID: NodeID, graph: RuleGraph, or: OrExpr): RuleGraph {
  const g1 = addNodeKnownID(graph, { type: "Union" }, orID);
  return or.opts.reduce((curG, andExpr) => {
    const [withAnd, andID] = addAnd(curG, andExpr.clauses);
    return addEdge(withAnd, andID, { toID: orID });
  }, g1);
}

function addAnd(graph: RuleGraph, and: AndTerm[]): [RuleGraph, NodeID] {
  if (and.length === 0) {
    throw new Error("empty and");
  }
  if (and.length === 1) {
    return addTerm(graph, and[0]);
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
  let leftRec: Rec = null;
  if (left.type === "Record") {
    leftRec = left;
  } else {
    throw new Error("incremental doesn't support BinExprs yet");
  }
  const [g1, joinID] = addNode(graph, {
    type: "Join",
    leftSide: leftRec,
    rightSide: leftRec, // TODO: fix this
  });
  const [g2, leftID] = addTerm(g1, left);
  const g3 = addEdge(g2, leftID, { toID: joinID, joinSide: "left" });
  const g4 = addEdge(g3, rightID, { toID: joinID, joinSide: "right" });
  return [g4, joinID];
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
  graph: RuleGraph,
  node: NodeDesc,
  id: NodeID
): RuleGraph {
  return { ...graph, nodes: { ...graph.nodes, [id]: { node, cache: [] } } };
}

function addNode(graph: RuleGraph, node: NodeDesc): [RuleGraph, NodeID] {
  return [
    {
      ...graph,
      nextNodeID: graph.nextNodeID + 1,
      nodes: { ...graph.nodes, [graph.nextNodeID]: { node, cache: [] } },
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
