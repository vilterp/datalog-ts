import { Rule, Rec, OrExpr, AndClause, VarMappings } from "../types";
import { RuleGraph, NodeDesc, NodeID } from "./types";
import { getMappings } from "../unify";
import { extractBinExprs } from "../evalCommon";
import { filterObj, setAdd, setUnion } from "../util";
import { ppRule, ppt, ppVM } from "../pretty";
import { List } from "immutable";
import { emptyIndexedCollection } from "./indexedCollection";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  return addNodeKnownID(name, graph, false, { type: "BaseFactTable" });
}

export function resolveUnmappedRule(
  graph: RuleGraph,
  rule: Rule,
  newNodes: Set<NodeID>
): RuleGraph {
  // console.log("try resolving", rule.head.relation);
  let curGraph = graph;
  let resolved = true;
  for (let newNodeID of newNodes) {
    const newNode = graph.nodes.get(newNodeID);
    const nodeDesc = newNode.desc;
    if (nodeDesc.type === "Match") {
      const callRec = nodeDesc.rec;
      const callNode = graph.nodes.get(callRec.relation);
      if (!callNode) {
        // not defined yet
        resolved = false;
        // console.log("=> exit: not defined yet:", callRec.relation);
        continue;
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
      // console.log("resolve Match", {
      //   ruleAttrs: ppt(ruleRec),
      //   callAttrs: ppt(callRec),
      //   mappings: ppVM(mappings, [], { showScopePath: false }),
      // });
      curGraph = updateMappings(curGraph, newNodeID, mappings);
    }
  }
  // console.log("resolveUnmappedRule", { head: rule.head.relation, resolved });
  return resolved ? removeUnmappedRule(curGraph, rule.head.relation) : curGraph;
}

type JoinInfo = {
  [varName: string]: {
    varName: string;
    leftAttr: string;
    rightAttr: string;
  };
};

export function findJoinInfo(left: Rec, right: Rec): JoinInfo {
  const out: JoinInfo = {};
  for (let leftAttr in left.attrs) {
    const leftVar = left.attrs[leftAttr];
    if (leftVar.type !== "Var") {
      continue;
    }
    for (let rightAttr in right.attrs) {
      const rightVar = right.attrs[rightAttr];
      if (rightVar.type !== "Var") {
        continue;
      }
      if (leftVar.name === rightVar.name) {
        out[leftVar.name] = {
          varName: leftVar.name,
          leftAttr,
          rightAttr,
        };
      }
    }
  }
  return out;
}

type AddResult = {
  newGraph: RuleGraph;
  newNodeIDs: Set<NodeID>;
  tipID: NodeID;
};

export function addOr(
  graph: RuleGraph,
  ruleName: string,
  or: OrExpr
): AddResult {
  if (or.opts.length === 1) {
    return addAnd(graph, ruleName, or.opts[0].clauses);
  }
  const [g1, orID] = addNode(graph, true, { type: "Union" });

  let outGraph = g1;
  let outNodeIDs = new Set<NodeID>([orID]);
  for (let orOption of or.opts) {
    const { newGraph, newNodeIDs, tipID: andID } = addAnd(
      outGraph,
      ruleName,
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

function addAnd(
  graph: RuleGraph,
  ruleName: string,
  clauses: AndClause[]
): AddResult {
  const { recs, exprs } = extractBinExprs(clauses);
  const withJoinRes = addJoin(graph, ruleName, recs);
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

function addJoin(graph: RuleGraph, ruleName: string, and: Rec[]): AddResult {
  if (and.length === 0) {
    throw new Error("empty and");
  }
  if (and.length === 1) {
    return addAndClause(graph, and[0]);
  }
  const { newGraph: g1, tipID: rightID, newNodeIDs: nn1 } = addJoin(
    graph,
    ruleName,
    and.slice(1)
  );
  const { newGraph: g2, tipID: andID, newNodeIDs: nn2 } = addAndBinary(
    g1,
    ruleName,
    and[0],
    rightID
  );
  return { newGraph: g2, tipID: andID, newNodeIDs: setUnion(nn1, nn2) };
}

function addAndBinary(
  graph: RuleGraph,
  ruleName: string,
  left: Rec,
  rightID: NodeID
): AddResult {
  const { newGraph: g1, newNodeIDs: nn1, tipID: leftID } = addAndClause(
    graph,
    left
  );
  const [g2, joinID] = addNode(g1, true, {
    type: "Join",
    ruleName,
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

// helpers

export function addNodeKnownID(
  id: NodeID,
  graph: RuleGraph,
  isInternal: boolean,
  desc: NodeDesc
): RuleGraph {
  return {
    ...graph,
    nodes: graph.nodes.set(id, {
      isInternal,
      desc,
      cache: emptyIndexedCollection(),
    }),
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
      nodes: graph.nodes.set(graph.nextNodeID.toString(), {
        desc,
        cache: emptyIndexedCollection(),
        isInternal,
      }),
    },
    `${graph.nextNodeID}`,
  ];
}

export function addEdge(graph: RuleGraph, from: NodeID, to: NodeID): RuleGraph {
  return {
    ...graph,
    edges: graph.edges.update(from, List(), (destinations) =>
      destinations.push(to)
    ),
  };
}

function updateMappings(
  graph: RuleGraph,
  from: NodeID,
  newMappings: VarMappings
): RuleGraph {
  return {
    ...graph,
    nodes: graph.nodes.update(from, (node) => ({
      ...node,
      // TODO: create index
      // cache: node.cache.createIndex(XXX, (res) => {
      //   XXX;
      // }),
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
