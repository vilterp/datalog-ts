import { Rule, Rec, OrExpr, AndClause, VarMappings } from "../types";
import {
  RuleGraph,
  NodeDesc,
  NodeID,
  JoinInfo,
  ColsToIndexByRelation,
  Res,
} from "./types";
import { getMappings } from "../unify";
import { extractBinExprs } from "../evalCommon";
import { appendToKey, filterObj, setAdd, setUnion } from "../util";
import { ppRule, ppt, ppVM } from "../pretty";
import { List } from "immutable";
import { IndexedCollection } from "./indexedCollection";

export function declareTable(graph: RuleGraph, name: string) {
  addNodeKnownID(name, graph, false, { type: "BaseFactTable" });
}

export function resolveUnmappedRule(
  graph: RuleGraph,
  rule: Rule,
  newNodes: Set<NodeID>
) {
  // console.log("try resolving", rule.head.relation);
  let resolved = true;
  for (let newNodeID of newNodes) {
    const newNode = graph.nodes[newNodeID];
    const nodeDesc = newNode.desc;
    if (nodeDesc.type === "Match") {
      const callRec = nodeDesc.rec;
      const callNode = graph.nodes[callRec.relation];
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
      updateMappings(graph, newNodeID, mappings);
    }
  }
  // console.log("resolveUnmappedRule", { head: rule.head.relation, resolved });
  if (resolved) {
    removeUnmappedRule(graph, rule.head.relation);
  }
}

export function getJoinInfo(left: Rec, right: Rec): JoinInfo {
  // console.log({ left, right });
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

function getColsToIndex(joinInfo: JoinInfo): ColsToIndexByRelation {
  const out: ColsToIndexByRelation = {
    left: [],
    right: [],
  };
  for (let varName of Object.keys(joinInfo)) {
    out.left.push(joinInfo[varName].leftAttr);
    out.right.push(joinInfo[varName].rightAttr);
  }
  return out;
}

type AddResult = {
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
  const orID = addNode(graph, true, { type: "Union" });

  let outNodeIDs = new Set<NodeID>([orID]);
  for (let orOption of or.opts) {
    const { newNodeIDs, tipID: andID } = addAnd(
      graph,
      ruleName,
      orOption.clauses
    );
    addEdge(graph, andID, orID);
    outNodeIDs = setUnion(outNodeIDs, newNodeIDs);
  }

  return {
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
  return exprs.reduce(({ tipID, newNodeIDs }, expr) => {
    const newExprID = addNode(graph, true, {
      type: "BinExpr",
      expr,
    });
    addEdge(graph, tipID, newExprID);
    return {
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
  const { tipID: rightID, newNodeIDs: nn1 } = addJoin(
    graph,
    ruleName,
    and.slice(1)
  );
  const { tipID: andID, newNodeIDs: nn2 } = addAndBinary(
    graph,
    ruleName,
    and[0],
    and[1],
    rightID
  );
  return { tipID: andID, newNodeIDs: setUnion(nn1, nn2) };
}

function addAndBinary(
  graph: RuleGraph,
  ruleName: string,
  left: Rec,
  right: Rec,
  rightID: NodeID
): AddResult {
  const joinInfo = getJoinInfo(left, right);
  const colsToIndex = getColsToIndex(joinInfo);
  const { newNodeIDs: nn1, tipID: leftID } = addAndClause(graph, left);
  const joinID = addNode(graph, true, {
    type: "Join",
    indexes: colsToIndex,
    joinInfo,
    ruleName,
    leftID,
    rightID,
  });
  addEdge(graph, leftID, joinID);
  addEdge(graph, rightID, joinID);
  // console.log({ colsToIndex });
  addIndex(graph, leftID, colsToIndex.left);
  addIndex(graph, rightID, colsToIndex.right);
  return {
    tipID: joinID,
    newNodeIDs: setAdd(nn1, joinID),
  };
}

function addAndClause(graph: RuleGraph, rec: Rec): AddResult {
  const matchID = addNode(graph, true, {
    type: "Match",
    rec,
    mappings: {},
  });
  addEdge(graph, rec.relation, matchID);
  return {
    newNodeIDs: new Set([matchID]),
    tipID: matchID,
  };
}

function addIndex(graph: RuleGraph, nodeID: NodeID, attrs: string[]) {
  graph.nodes[nodeID].cache.createIndex(getIndexName(attrs), (res) => {
    // TODO: is this gonna be a perf bottleneck?
    // console.log({ attrs, res: ppt(res.term) });
    return getIndexKey(res.term as Rec, attrs);
  });
}

type ColName = string;

export function getIndexKey(rec: Rec, attrs: ColName[]): string[] {
  return attrs.map((attr) => ppt(rec.attrs[attr]));
}

export function getIndexName(attrs: ColName[]): string {
  return attrs.join("-");
}

// helpers

export function addNodeKnownID(
  id: NodeID,
  graph: RuleGraph,
  isInternal: boolean,
  desc: NodeDesc
) {
  graph.nodes[id] = {
    isInternal,
    desc,
    cache: new IndexedCollection<Res>(),
  };
}

function addNode(
  graph: RuleGraph,
  isInternal: boolean,
  desc: NodeDesc
): NodeID {
  const ret = `${graph.nextNodeID}`;
  graph.nodes[graph.nextNodeID] = {
    desc,
    cache: new IndexedCollection<Res>(),
    isInternal,
  };
  graph.nextNodeID++;
  return ret;
}

export function addEdge(graph: RuleGraph, from: NodeID, to: NodeID) {
  appendToKey(graph.edges, from, to);
}

function updateMappings(
  graph: RuleGraph,
  from: NodeID,
  newMappings: VarMappings
) {
  const node = graph.nodes[from];
  if (node.desc.type === "Match") {
    node.desc.mappings = newMappings;
  }
}

export function addUnmappedRule(
  graph: RuleGraph,
  rule: Rule,
  newNodeIDs: Set<NodeID>
) {
  graph.unmappedRules[rule.head.relation] = { rule, newNodeIDs };
}

function removeUnmappedRule(graph: RuleGraph, ruleName: string) {
  delete graph.unmappedRules[ruleName];
}
