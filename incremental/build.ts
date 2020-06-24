import { Rule, Rec, AndExpr, OrExpr, BinExpr } from "../types";
import { RuleGraph, NodeDesc, NodeID } from "./types";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  const id = graph.nextNodeID;
  return {
    ...graph,
    nextNodeID: graph.nextNodeID + 1,
    nodes: {
      ...graph.nodes,
      [id]: {
        node: { type: "BaseFactTable", name },
        cache: [],
      },
    },
    relationRefs: { ...graph.relationRefs, [name]: `${id}` },
  };
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

export function addRule(graph: RuleGraph, rule: Rule): RuleGraph {
  const [withOr, id] = addOr(graph, rule.defn);
  // TODO: what about matches
  return {
    ...withOr,
    relationRefs: { ...graph.relationRefs, [rule.head.relation]: id },
  };
}

function addOr(graph: RuleGraph, or: OrExpr): [RuleGraph, NodeID] {
  const [g1, orID] = addNode(graph, { type: "Union" });
  return [
    or.opts.reduce((curG, andExpr) => {
      const [withAnd, andID] = addAnd(curG, andExpr.clauses);
      return addEdge(withAnd, andID, orID);
    }, g1),
    orID,
  ];
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
