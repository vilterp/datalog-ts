import { Rule, Rec, OrExpr, BinExpr, Term } from "../types";
import { RuleGraph, NodeDesc, NodeID } from "./types";
import { getMappings } from "../unify";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  return addNodeKnownID(name, graph, { type: "BaseFactTable", name }, false);
}

export function addRule(graph: RuleGraph, rule: Rule): RuleGraph {
  // TODO: compute cache for this rule when we add it
  const matchID = rule.head.relation;
  const [withOr, orID] = addOr(graph, rule.defn);
  const withMatch = addNodeKnownID(
    matchID,
    withOr,
    {
      type: "Substitute",
      rec: rule.head,
    },
    false
  );
  return addEdge(withMatch, orID, matchID);
}

function addOr(graph: RuleGraph, or: OrExpr): [RuleGraph, NodeID] {
  if (or.opts.length === 1) {
    return addAnd(graph, or.opts[0].clauses);
  }
  const [g1, orID] = addNode(graph, { type: "Union" }, true);
  const withAndAndEdges = or.opts.reduce((curG, andExpr) => {
    const [withAnd, andID] = addAnd(curG, andExpr.clauses);
    return addEdge(withAnd, andID, orID);
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
  const [g1, leftID] = addTerm(graph, left);
  const [g2, joinID] = addNode(
    g1,
    {
      type: "Join",
      leftID,
      rightID,
    },
    true
  );
  const g3 = addEdge(g2, leftID, joinID);
  const g4 = addEdge(g3, rightID, joinID);
  return [g4, joinID];
}

type AndTerm = Rec | BinExpr;

function addTerm(graph: RuleGraph, term: AndTerm): [RuleGraph, NodeID] {
  switch (term.type) {
    case "BinExpr":
      return addNode(
        graph,
        {
          type: "BinExpr",
          expr: term,
        },
        true
      );
    case "Record":
      const targetNode = graph.nodes[term.relation];
      if (!targetNode) {
        throw new Error(
          `references "${term.relation}", which hasn't been defined yet`
        );
      }
      const desc = targetNode.desc;
      if (desc.type === "BaseFactTable") {
        const [withMatch, matchID] = addNode(
          graph,
          {
            type: "Match",
            rec: term,
            mappings: {},
          },
          true
        );
        const withMatchEdge = addEdge(withMatch, term.relation, matchID);
        return [withMatchEdge, matchID];
      } else if (desc.type === "Substitute") {
        const [withMatch, matchID] = addNode(
          graph,
          {
            type: "Match",
            rec: term,
            mappings: getMappings(desc.rec.attrs, term.attrs),
          },
          true
        );
        const withMatchEdge = addEdge(withMatch, term.relation, matchID);
        return [withMatchEdge, matchID];
      } else {
        throw new Error(
          "rule should either reference a base fact of a Subst node"
        );
      }
  }
}

// helpers

function addNodeKnownID(
  id: NodeID,
  graph: RuleGraph,
  desc: NodeDesc,
  isInternal: boolean
): RuleGraph {
  return {
    ...graph,
    nodes: { ...graph.nodes, [id]: { isInternal, desc, cache: [] } },
  };
}

function addNode(
  graph: RuleGraph,
  desc: NodeDesc,
  internal: boolean
): [RuleGraph, NodeID] {
  return [
    {
      ...graph,
      nextNodeID: graph.nextNodeID + 1,
      nodes: {
        ...graph.nodes,
        [graph.nextNodeID]: { desc, cache: [], internal },
      },
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
