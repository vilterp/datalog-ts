import { Rule, Rec, OrExpr, AndClause, VarMappings, Res } from "../types";
import { RuleGraph, NodeDesc, NodeID, JoinInfo, VarToPath } from "./types";
import { getMappings } from "../unify";
import { extractBinExprs } from "../binExpr";
import {
  combineObjects,
  filterObj,
  permute,
  setAdd,
  setUnion,
} from "../../util/util";
import { ppb } from "../pretty";
import { List } from "immutable";
import { emptyIndexedCollection } from "../../util/indexedCollection";
import { fastPPT } from "../fastPPT";

export function declareTable(graph: RuleGraph, name: string): RuleGraph {
  if (graph.nodes.has(name)) {
    return graph;
  }
  const withNode = addNodeKnownID(name, graph, false, {
    type: "BaseFactTable",
  });
  const resolved = resolveUnmappedRules(withNode);
  return { ...resolved, tables: [...graph.tables, name] };
}

export function resolveUnmappedRules(graph: RuleGraph) {
  let resultGraph = graph;
  for (let unmappedRuleName in graph.unmappedRules) {
    const rule = graph.unmappedRules[unmappedRuleName];
    resultGraph = resolveUnmappedRule(resultGraph, rule.rule, rule.newNodeIDs);
  }
  return resultGraph;
}

export function resolveUnmappedRule(
  graph: RuleGraph,
  rule: Rule,
  newNodes: Set<NodeID>
): RuleGraph {
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

export function getJoinInfo(left: Rec, right: Rec): JoinInfo {
  const leftVars = getVarToPath(left);
  const rightVars = getVarToPath(right);
  return {
    leftVars,
    rightVars,
    join: combineObjects(
      leftVars,
      rightVars,
      (varName, leftAttr, rightAttr) => ({ varName, leftAttr, rightAttr })
    ),
  };
}

function getVarToPath(rec: Rec): VarToPath {
  const out: VarToPath = {};
  Object.entries(rec.attrs).forEach(([attr, attrVal]) => {
    switch (attrVal.type) {
      case "Var":
        out[attrVal.name] = [attr];
        break;
      case "Record":
        const subMapping = getVarToPath(attrVal);
        Object.entries(subMapping).forEach(([subVar, subPath]) => {
          out[subVar] = [attr, ...subPath];
        });
        break;
      // TODO: lists?
    }
  });
  return out;
}

// TODO: put RuleGraph back into this
export type AddResult = {
  newGraph: RuleGraph;
  newNodeIDs: Set<NodeID>;
  rec: Rec;
  tipID: NodeID;
};

export function addOr(
  graph: RuleGraph,
  ruleName: string,
  or: OrExpr
): AddResult {
  if (or.opts.length === 1) {
    return addAnd(graph, or.opts[0].clauses);
  }
  const [g1, orID] = addNode(graph, true, { type: "Union" });

  let outGraph = g1;
  let outNodeIDs = new Set<NodeID>([orID]);
  for (let orOption of or.opts) {
    const {
      newGraph,
      newNodeIDs,
      tipID: andID,
    } = addAnd(outGraph, orOption.clauses);
    outGraph = addEdge(newGraph, andID, orID);
    outNodeIDs = setUnion(outNodeIDs, newNodeIDs);
  }

  return {
    newGraph: outGraph,
    newNodeIDs: outNodeIDs,
    rec: null, // ???
    tipID: orID,
  };
}

function addAnd(graph: RuleGraph, clauses: AndClause[]): AddResult {
  const { recs, exprs } = extractBinExprs(clauses);
  const allRecPermutations = permute(recs);
  const allJoinTrees = allRecPermutations.map((recs) => {
    const tree = getJoinTree(recs);
    return { tree, numCommonVars: numJoinsWithCommonVars(tree) };
  });
  allJoinTrees.sort((left, right) => {
    return left.numCommonVars - right.numCommonVars;
  });
  const joinTree = allJoinTrees[allJoinTrees.length - 1].tree;

  let outRes = addJoinTree(graph, joinTree);

  for (const expr of exprs) {
    const [outGraph2, newExprID] = addNode(outRes.newGraph, true, {
      type: "BinExpr",
      expr,
    });
    outRes.newGraph = outGraph2;
    outRes.newGraph = addEdge(outRes.newGraph, outRes.tipID, newExprID);
    outRes = {
      newGraph: outRes.newGraph,
      tipID: newExprID,
      rec: null, // TODO: fix
      newNodeIDs: setAdd(outRes.newNodeIDs, newExprID),
    };
  }
  return outRes;
}

function addAndBinary(
  graph: RuleGraph,
  left: Rec,
  right: Rec,
  rightID: NodeID
): AddResult {
  let outGraph = graph;
  const joinInfo = getJoinInfo(left, right);
  const varsToIndex = Object.keys(joinInfo.join);
  const {
    newGraph: outGraph2,
    newNodeIDs: nn1,
    tipID: leftID,
  } = addRec(outGraph, left);
  outGraph = outGraph2;
  const [outGraph3, joinID] = addNode(outGraph, true, {
    type: "Join",
    joinVars: Object.keys(joinInfo.join),
    leftID,
    rightID,
  });
  outGraph = outGraph3;
  outGraph = addEdge(outGraph, leftID, joinID);
  outGraph = addEdge(outGraph, rightID, joinID);
  // console.log({ colsToIndex });
  outGraph = addIndex(outGraph, leftID, varsToIndex);
  outGraph = addIndex(outGraph, rightID, varsToIndex);
  return {
    newGraph: outGraph,
    tipID: joinID,
    rec: left,
    newNodeIDs: setAdd(nn1, joinID),
  };
}

function addJoinTree(ruleGraph: RuleGraph, joinTree: JoinTree): AddResult {
  if (joinTree.type === "Leaf") {
    return addRec(ruleGraph, joinTree.rec);
  }
  const {
    newGraph,
    tipID: rightID,
    rec: rightRec,
    newNodeIDs: nn1,
  } = addJoinTree(ruleGraph, joinTree.right);
  const {
    newGraph: newGraph2,
    tipID: andID,
    newNodeIDs: nn2,
  } = addAndBinary(newGraph, joinTree.left, rightRec, rightID);
  return {
    newGraph: newGraph2,
    tipID: andID,
    rec: joinTree.left,
    newNodeIDs: setUnion(nn1, nn2),
  };
}

function addRec(graph: RuleGraph, rec: Rec): AddResult {
  const [graph2, matchID] = addNode(graph, true, {
    type: "Match",
    rec,
    mappings: {},
  });
  const graph3 = addEdge(graph2, rec.relation, matchID);
  return {
    newGraph: graph3,
    newNodeIDs: new Set([matchID]),
    rec,
    tipID: matchID,
  };
}

type ColName = string;

export function getIndexKey(res: Res, varNames: string[]): List<string> {
  return List(
    varNames.map((varName) => {
      const term = res.bindings[varName];
      if (!term) {
        throw new Error(
          `couldn't get attr "${varName}" of "${ppb(res.bindings)}"`
        );
      }
      return fastPPT(term);
    })
  );
}

export function getIndexName(attrs: ColName[]): string {
  return attrs.join("-");
}

export type JoinTree =
  | {
      type: "Leaf";
      rec: Rec;
    }
  | { type: "Node"; left: Rec; joinInfo: JoinInfo; right: JoinTree | null };

export function getJoinTree(recs: Rec[]): JoinTree {
  if (recs.length === 1) {
    return { type: "Leaf", rec: recs[0] };
  }
  return {
    type: "Node",
    left: recs[0],
    // are we joining with just the next record, or everything on the right?
    joinInfo: getJoinInfo(recs[0], recs[1]),
    right: getJoinTree(recs.slice(1)),
  };
}

export function numJoinsWithCommonVars(joinTree: JoinTree): number {
  if (joinTree.type === "Leaf") {
    return 0;
  }
  const thisDoes = Object.keys(joinTree.joinInfo.join).length > 0 ? 1 : 0;
  return thisDoes + numJoinsWithCommonVars(joinTree.right);
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

function addIndex(
  graph: RuleGraph,
  nodeID: NodeID,
  attrs: string[]
): RuleGraph {
  return {
    ...graph,
    nodes: graph.nodes.update(nodeID, (node) => ({
      ...node,
      cache: node.cache.createIndex(getIndexName(attrs), (res) => {
        // TODO: is this gonna be a perf bottleneck?
        // console.log({ attrs, res: ppt(res.term) });
        return getIndexKey(res, attrs);
      }),
    })),
  };
}
