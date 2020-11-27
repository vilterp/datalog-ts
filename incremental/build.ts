import { Rule, Rec, OrExpr, AndClause, VarMappings } from "../types";
import { RuleGraph, NodeDesc, NodeID } from "./types";
import { getMappings } from "../unify";
import { extractBinExprs } from "../evalCommon";
import { updateObj } from "../util";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  return addNodeKnownID(name, graph, false, { type: "BaseFactTable", name });
}

export function addRule(graph: RuleGraph, rule: Rule): RuleGraph {
  // TODO: compute cache for this rule when we add it
  const matchID = rule.head.relation;
  const [withOr, orID] = addOr(graph, rule.defn);
  const withMatch = addNodeKnownID(matchID, withOr, false, {
    type: "Substitute",
    rec: rule.head,
  });
  const withEdge = addEdge(withMatch, orID, matchID);
  // uh... how many calls are there
  return resolveMappings(withEdge, rule.head, callID);
}

function resolveMappings(
  graph: RuleGraph,
  ruleHead: Rec,
  callID: NodeID
): RuleGraph {
  const call = graph.nodes[callID];
  const callDesc = call.desc;
  if (callDesc.type !== "Match") {
    throw new Error("call should be a Match");
  }
  const newMappings = getMappings(ruleHead.attrs, callDesc.rec.attrs);
  return updateMappings(graph, ruleHead.relation, newMappings);
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
  const [withMatch, matchID] = addNode(graph, true, {
    type: "Match",
    rec,
    mappings: {},
  });
  const withMatchEdge = addEdge(withMatch, rec.relation, matchID);
  return [withMatchEdge, matchID];
}

// helpers

function addNodeKnownID(
  id: NodeID,
  graph: RuleGraph,
  isInternal: boolean,
  desc: NodeDesc
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

function updateMappings(
  graph: RuleGraph,
  from: NodeID,
  newMappings: VarMappings
): RuleGraph {
  return {
    ...graph,
    nodes: updateObj(graph.nodes, from, (node) => ({
      ...node,
      desc:
        node.desc.type === "Match"
          ? { ...node.desc, mappings: newMappings }
          : node.desc,
    })),
  };
}
