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
import { ppRule, ppt, ppVM } from "../pretty";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  return addNodeKnownID(name, graph, false, { type: "BaseFactTable" });
}

export function resolveUnmappedRule(
  graph: RuleGraph,
  rule: Rule,
  newNodes: Set<NodeID>
): RuleGraph {
  let curGraph = graph;
  let resolved = true;
  console.log("resolveUnmappedRule", newNodes);
  for (let newNodeID of newNodes) {
    console.log({ newNodeID });
    const newNode = graph.nodes[newNodeID];
    const nodeDesc = newNode.desc;
    if (nodeDesc.type === "Match") {
      const callRec = nodeDesc.rec;
      const callNode = graph.nodes[callRec.relation];
      if (!callNode) {
        // not defined yet
        resolved = false;
      }
      const ruleNodeDesc = callNode.desc;
      if (ruleNodeDesc.type === "BaseFactTable") {
        // don't need to worry about mappings for base fact tables
        continue;
      }
      if (ruleNodeDesc.type !== "Substitute") {
        throw new Error("rule should be a Subst node");
      }
      const ruleRec = ruleNodeDesc.rec;
      const mappings = getMappings(ruleRec.attrs, callRec.attrs);
      console.log(ppVM(mappings, [], { showScopePath: false }));
      curGraph = updateMappings(graph, newNodeID, mappings);
    }
  }
  return resolved ? removeUnmappedRule(curGraph, rule.head.relation) : curGraph;
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

  let outGraph = g1;
  let outNodeIDs = new Set<NodeID>([orID]);
  for (let orOption of or.opts) {
    const { newGraph, newNodeIDs, tipID: andID } = addAnd(
      outGraph,
      orOption.clauses
    );
    outGraph = addEdge(newGraph, andID, orID);
    outNodeIDs = setUnion(outNodeIDs, newNodeIDs);
  }

  return {
    newGraph: outGraph,
    newNodeIDs: outNodeIDs,
    tipID: orID,
  };
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
