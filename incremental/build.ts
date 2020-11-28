import { Rule, Rec, OrExpr, AndClause, VarMappings } from "../types";
import { RuleGraph, NodeDesc, NodeID, Res } from "./types";
import { getMappings } from "../unify";
import { extractBinExprs } from "../evalCommon";
import {
  filterMap,
  filterObj,
  flatMap,
  setAdd,
  setUnion,
  updateObj,
} from "../util";
import { ppRule, ppt } from "../pretty";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  return addNodeKnownID(name, graph, false, { type: "BaseFactTable" });
}

export function resolveUnmappedRule(
  graph: RuleGraph,
  rule: Rule,
  newNodes: Set<NodeID>
): RuleGraph {
  const { newGraph, nowResolved } = [...newNodes].reduce(
    ({ newGraph: curGraph, nowResolved }, newNodeID) => {
      const { newGraph, nowResolved: nextResolved } = resolveUnmappedCall(
        curGraph,
        newNodeID
      );
      return { newGraph, nowResolved: nextResolved && nowResolved };
    },
    { newGraph: graph, nowResolved: true }
  );
  console.log({ nowResolved });
  return nowResolved
    ? removeUnmappedRule(newGraph, rule.head.relation)
    : newGraph;
}

function resolveUnmappedCall(
  graph: RuleGraph,
  unmappedCallID: NodeID
): { newGraph: RuleGraph; nowResolved: boolean } {
  const callNodeDesc = graph.nodes[unmappedCallID].desc;
  if (callNodeDesc.type !== "Match") {
    // skip non-match nodes
    return { newGraph: graph, nowResolved: true };
  }
  const callRec = callNodeDesc.rec;
  // console.log("resolveUnmappedCall", {
  //   nodes: graph.nodes,
  //   unmappedCallID,
  //   callRec: ppt(callRec),
  // });
  const ruleNode = graph.nodes[callRec.relation];
  if (!ruleNode) {
    // still not defined
    return { newGraph: graph, nowResolved: false };
  }
  const ruleNodeDesc = ruleNode.desc;
  if (ruleNodeDesc.type === "BaseFactTable") {
    // don't need to worry about mappings for base fact tables
    return { newGraph: graph, nowResolved: false };
  }
  if (ruleNodeDesc.type !== "Substitute") {
    throw new Error("rule should be a Subst node");
  }
  const ruleRec = ruleNodeDesc.rec;
  const mappings = getMappings(ruleRec.attrs, callRec.attrs);
  const newGraph = updateMappings(graph, unmappedCallID, mappings);
  return { newGraph, nowResolved: true };
}

type AddResult = {
  newGraph: RuleGraph;
  newNodeIDs: Set<NodeID>;
  tipID: NodeID;
};

export function addOr(graph: RuleGraph, or: OrExpr): AddResult {
  if (or.opts.length === 1) {
    return addAnd(graph, or.opts[0].clauses);
  }
  const [g1, orID] = addNode(graph, true, { type: "Union" });
  return or.opts.reduce(
    ({ newGraph, tipID, newNodeIDs }, andExpr) => {
      const {
        newGraph: withAnd,
        tipID: andID,
        newNodeIDs: moreNodeIDs,
      } = addAnd(newGraph, andExpr.clauses);
      const withEdge = addEdge(withAnd, andID, orID);
      return {
        newGraph: withEdge,
        newNodeIDs: setUnion(newNodeIDs, moreNodeIDs),
        tipID: andID,
      };
    },
    { newGraph: g1, tipID: orID, newNodeIDs: new Set<NodeID>() }
  );
}

function addAnd(graph: RuleGraph, clauses: AndClause[]): AddResult {
  const { recs, exprs } = extractBinExprs(clauses);
  const withJoinRes = addJoin(graph, recs);
  return exprs.reduce(({ newGraph, tipID, newNodeIDs }, expr) => {
    const [withNewExpr, newExprID] = addNode(newGraph, true, {
      type: "BinExpr",
      expr,
    });
    const withEdge = addEdge(withNewExpr, tipID, newExprID);
    return {
      newGraph: withEdge,
      tipID: newExprID,
      newNodeIDs: setAdd(newNodeIDs, newExprID),
    };
  }, withJoinRes);
}

function addJoin(graph: RuleGraph, and: Rec[]): AddResult {
  if (and.length === 0) {
    throw new Error("empty and");
  }
  if (and.length === 1) {
    return addAndClause(graph, and[0]);
  }
  const { newGraph: g1, tipID: rightID, newNodeIDs: nn1 } = addJoin(
    graph,
    and.slice(1)
  );
  const { newGraph: g2, tipID: andID, newNodeIDs: nn2 } = addAndBinary(
    g1,
    and[0],
    rightID
  );
  return { newGraph: g2, tipID: andID, newNodeIDs: setUnion(nn1, nn2) };
}

function addAndBinary(graph: RuleGraph, left: Rec, rightID: NodeID): AddResult {
  const { newGraph: g1, newNodeIDs: nn1, tipID: leftID } = addAndClause(
    graph,
    left
  );
  const [g2, joinID] = addNode(g1, true, {
    type: "Join",
    leftID,
    rightID,
  });
  const g3 = addEdge(g2, leftID, joinID);
  const g4 = addEdge(g3, rightID, joinID);
  return {
    newGraph: g4,
    tipID: joinID,
    newNodeIDs: setAdd(nn1, joinID),
  };
}

function addAndClause(graph: RuleGraph, rec: Rec): AddResult {
  const [withMatch, matchID] = addNode(graph, true, {
    type: "Match",
    rec,
    mappings: {},
  });
  const withMatchEdge = addEdge(withMatch, rec.relation, matchID);
  return {
    newGraph: withMatchEdge,
    newNodeIDs: new Set([matchID]),
    tipID: matchID,
  };
}

function getRoots(rule: Rule): NodeID[] {
  return flatMap(rule.defn.opts, (opt) => {
    return filterMap(opt.clauses, (andClause) => {
      if (andClause.type === "BinExpr") {
        return null;
      }
      return andClause.relation;
    });
  });
}

// helpers

export function addNodeKnownID(
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

export function addEdge(graph: RuleGraph, from: NodeID, to: NodeID): RuleGraph {
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

export function addUnmappedRule(
  graph: RuleGraph,
  rule: Rule,
  newNodeIDs: Set<NodeID>
): RuleGraph {
  return {
    ...graph,
    unmappedRules: {
      ...graph.unmappedRules,
      [rule.head.relation]: { rule, newNodeIDs },
    },
  };
}

function removeUnmappedRule(graph: RuleGraph, ruleName: string): RuleGraph {
  return {
    ...graph,
    unmappedRules: filterObj(
      graph.unmappedRules,
      (name: string) => name !== ruleName
    ),
  };
}
