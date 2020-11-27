import { Rule, Rec, OrExpr, AndClause } from "../types";
import { RuleGraph, NodeDesc, NodeID } from "./types";
import { getMappings } from "../unify";
import { extractBinExprs } from "../evalCommon";

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
  const [g1, orID] = addNode(graph, true, { type: "Union" });
  const withAndAndEdges = or.opts.reduce((curG, andExpr) => {
    const [withAnd, andID] = addAnd(curG, andExpr.clauses);
    return addEdge(withAnd, andID, orID);
  }, g1);
  return [withAndAndEdges, orID];
}

function addAnd(graph: RuleGraph, clauses: AndClause[]): [RuleGraph, NodeID] {
  const { recs, exprs } = extractBinExprs(clauses);
  const [withJoin, joinID] = addJoin(graph, recs);
  return exprs.reduce(
    ([latestGraph, latestID], expr) => {
      const [withNewExpr, newExprID] = addNode(latestGraph, true, {
        type: "BinExpr",
        expr,
      });
      return [addEdge(withNewExpr, latestID, newExprID), newExprID];
    },
    [withJoin, joinID]
  );
}

function addJoin(graph: RuleGraph, and: Rec[]): [RuleGraph, NodeID] {
  if (and.length === 0) {
    throw new Error("empty and");
  }
  if (and.length === 1) {
    const [newGraph, id] = addAndClause(graph, and[0]);
    return [newGraph, id];
  }
  const [g1, rightID] = addJoin(graph, and.slice(1));
  return addAndBinary(g1, and[0], rightID);
}

function addAndBinary(
  graph: RuleGraph,
  left: Rec,
  rightID: NodeID
): [RuleGraph, NodeID] {
  const [g1, leftID] = addAndClause(graph, left);
  const [g2, joinID] = addNode(g1, true, {
    type: "Join",
    leftID,
    rightID,
  });
  const g3 = addEdge(g2, leftID, joinID);
  const g4 = addEdge(g3, rightID, joinID);
  return [g4, joinID];
}

function addAndClause(graph: RuleGraph, rec: Rec): [RuleGraph, NodeID] {
  const targetNode = graph.nodes[rec.relation];
  if (!targetNode) {
    throw new Error(
      `references "${rec.relation}", which hasn't been defined yet`
    );
  }
  const desc = targetNode.desc;
  if (desc.type === "BaseFactTable") {
    const [withMatch, matchID] = addNode(graph, true, {
      type: "Match",
      rec,
      mappings: {},
    });
    const withMatchEdge = addEdge(withMatch, rec.relation, matchID);
    return [withMatchEdge, matchID];
  } else if (desc.type === "Substitute") {
    const [withMatch, matchID] = addNode(graph, true, {
      type: "Match",
      rec,
      mappings: getMappings(desc.rec.attrs, rec.attrs),
    });
    const withMatchEdge = addEdge(withMatch, rec.relation, matchID);
    return [withMatchEdge, matchID];
  } else {
    throw new Error("rule should either reference a base fact of a Subst node");
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
  isInternal: boolean,
  desc: NodeDesc
): [RuleGraph, NodeID] {
  return [
    {
      ...graph,
      nextNodeID: graph.nextNodeID + 1,
      nodes: {
        ...graph.nodes,
        [graph.nextNodeID]: { desc, cache: [], isInternal },
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
