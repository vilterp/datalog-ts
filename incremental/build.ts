import { Rule, Rec, OrExpr, BinExpr } from "../types";
import { RuleGraph, NodeDesc, NodeID } from "./types";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  const [g1, id] = addNode(graph, { type: "BaseFactTable", name });
  return addRef(g1, name, id);
}

export function addRule(graph: RuleGraph, rule: Rule): RuleGraph {
  const [g1, orID] = reserveNodeID(graph);
  const g2 = addRef(g1, rule.head.relation, orID);
  const g3 = addOr(orID, g2, rule.defn);
  // TODO: what about matches
  return g3;
}

function addOr(orID: NodeID, graph: RuleGraph, or: OrExpr): RuleGraph {
  const g1 = addNodeKnownID(graph, { type: "Union" }, orID);
  return or.opts.reduce((curG, andExpr) => {
    const [withAnd, andID] = addAnd(curG, andExpr.clauses);
    return addEdge(withAnd, andID, orID);
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
  const [g1, joinID] = addNode(graph, {
    type: "Join",
    leftAttr: "foo",
    rightAttr: "bar",
  });
  const [g2, leftID] = addTerm(g1, left);
  const g3 = addEdge(g2, leftID, joinID);
  const g4 = addEdge(g3, rightID, joinID);
  return [g4, joinID];
}

type AndTerm = Rec | BinExpr;

function addTerm(graph: RuleGraph, term: AndTerm): [RuleGraph, NodeID] {
  switch (term.type) {
    case "BinExpr":
      return addNode(graph, { type: "BinExpr", expr: term });
    case "Record":
      // TODO: match?
      const relID = graph.relationRefs[term.relation];
      if (!relID) {
        throw new Error(`loop: ${term.relation}`);
      }
      return [graph, relID];
  }
}

// helpers

function reserveNodeID(graph: RuleGraph): [RuleGraph, NodeID] {
  const id = graph.nextNodeID;
  const withIDReserved = { ...graph, nextNodeID: id + 1 };
  return [withIDReserved, `${id}`];
}

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

function addEdge(graph: RuleGraph, from: NodeID, to: NodeID): RuleGraph {
  return {
    ...graph,
    edges: { ...graph.edges, [from]: [...(graph.edges[from] || []), to] },
  };
}

function addRef(graph: RuleGraph, ref: string, id: NodeID): RuleGraph {
  return {
    ...graph,
    relationRefs: { ...graph.relationRefs, [ref]: id },
  };
}
