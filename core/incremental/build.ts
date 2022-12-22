import {
  Rule,
  Rec,
  Disjunction,
  Conjunct,
  VarMappings,
  Res,
  Negation,
  Aggregation,
  rec,
} from "../types";
import {
  RuleGraph,
  NodeDesc,
  NodeID,
  JoinInfo,
  VarToPath,
  emptyRuleGraph,
} from "./types";
import { combineObjects, permute, setAdd, setUnion } from "../../util/util";
import { ppb } from "../pretty";
import { List } from "immutable";
import { emptyIndexedCollection } from "../../util/indexedCollection";
import { fastPPT } from "../fastPPT";
import { BUILTINS } from "../builtins";
import { Catalog } from "./catalog";

export function buildGraph(catalog: Catalog): RuleGraph {
  const entries = Object.entries(catalog);
  let graph = emptyRuleGraph;
  graph = entries.reduce((accum, [relName, rel]) => {
    switch (rel.type) {
      case "Table":
        return declareTable(accum, relName);
      default:
        return accum;
    }
  }, graph);
  graph = entries.reduce((accum, [relName, rel]) => {
    switch (rel.type) {
      case "Rule":
        return addRule(accum, rel.rule);
      default:
        return accum;
    }
  }, graph);
  return graph;
}

function addRule(graph: RuleGraph, rule: Rule): RuleGraph {
  const { newGraph: withOr, tipID } = addOr(graph, rule.body);
  const withSubst = addNodeKnownID(rule.head.relation, withOr, false, {
    type: "Substitute",
    rec: rule.head,
  });
  return addEdge(withSubst, tipID, rule.head.relation);
}

function declareTable(graph: RuleGraph, name: string): RuleGraph {
  if (graph.nodes.has(name)) {
    return graph;
  }
  const withNode = addNodeKnownID(name, graph, false, {
    type: "BaseFactTable",
  });
  return withNode;
}

export function getJoinInfo(left: Conjunct, right: Conjunct): JoinInfo {
  const leftVars = getVarToPath(left.type === "Record" ? left : left.record);
  const rightVars = getVarToPath(
    right.type === "Record" ? right : right.record
  );
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

function addOr(graph: RuleGraph, or: Disjunction): GraphWithTip {
  if (or.disjuncts.length === 1) {
    return addAnd(graph, or.disjuncts[0].conjuncts);
  }
  const [g1, orID] = addNode(graph, true, { type: "Union" });

  let outGraph = g1;
  for (let orOption of or.disjuncts) {
    const { newGraph, tipID: andID } = addAnd(outGraph, orOption.conjuncts);
    outGraph = addEdge(newGraph, andID, orID);
  }

  return {
    newGraph: outGraph,
    tipID: orID,
  };
}

type AddConjunctResult = {
  newGraph: RuleGraph;
  rec: Rec;
  tipID: NodeID;
};

type GraphWithTip = {
  newGraph: RuleGraph;
  tipID: NodeID;
};

function addAnd(graph: RuleGraph, conjuncts: Conjunct[]): AddConjunctResult {
  // add normal conjuncts
  const allRecPermutations = permute(conjuncts);
  const allJoinTrees = allRecPermutations.map((permutation) => {
    const tree = getJoinTree(permutation);
    return { permutation, numCommonVars: numJoinsWithCommonVars(tree) };
  });
  allJoinTrees.sort((left, right) => {
    return left.numCommonVars - right.numCommonVars;
  });
  const winningPermuation = allJoinTrees[allJoinTrees.length - 1].permutation;
  return addJoinTree(graph, winningPermuation);
}

function addJoinTree(
  graph: RuleGraph,
  conjuncts: Conjunct[]
): AddConjunctResult {
  if (conjuncts.length === 1 && conjuncts[0].type === "Negation") {
    throw new Error("can't have a single negation as the body");
  }

  let newGraph = graph;
  let tipID: NodeID | null = null;
  let rec = null;
  conjuncts.forEach((conjunct) => {
    const res0 = addRec(graph, getRecord(conjunct));
    switch (conjunct.type) {
      case "Record":
        if (tipID != null) {
          const res = addJoin(newGraph, leftRes0, rightRes);
          newGraph = res.newGraph;
          tipID = res.tipID;
          rec = res.rec;
        }
        break;
      case "Negation":
        XXXX;
        break;
      case "Aggregation":
        const res = addAggregation(res, conjunct);
        break;
    }
  });
  // TODO: does `rec` need to be here?
  return { newGraph, tipID, rec };
}

function getRecord(conjunct: Conjunct): Rec {
  switch (conjunct.type) {
    case "Record": {
      return conjunct;
    }
    case "Aggregation":
      return conjunct.record;
    case "Negation": {
      return conjunct.record;
    }
  }
}

function addNegation(
  prev: GraphWithTip,
  negation: Negation
): AddConjunctResult {
  const [graph2, negationID] = addNode(prev.newGraph, true, {
    type: "Negation",
    joinDesc: XXXX,
    received: 0,
  });
  const graph3 = addEdge(graph2, prev.tipID, negationID);
  return {
    newGraph: graph3,
    rec: negation.record,
    tipID: negationID,
  };
}

function addAggregation(
  prev: GraphWithTip,
  aggregation: Aggregation
): AddConjunctResult {
  const [graph2, aggID] = addNode(prev.newGraph, true, {
    type: "Aggregation",
    aggregation,
  });
  const graph3 = addEdge(graph2, prev.tipID, aggID);
  return {
    newGraph: graph3,
    rec: aggregation.record,
    tipID: aggID,
  };
}

function addJoin(
  graph: RuleGraph,
  left: AddConjunctResult,
  right: AddConjunctResult
): AddConjunctResult {
  let outGraph = graph;
  const joinInfo = getJoinInfo(left.rec, right.rec);
  const varsToIndex = Object.keys(joinInfo.join);
  const [outGraph3, joinID] = addNode(outGraph, true, {
    type: "Join",
    joinVars: Object.keys(joinInfo.join),
    leftID: left.tipID,
    rightID: right.tipID,
  });
  outGraph = outGraph3;
  outGraph = addEdge(outGraph, left.tipID, joinID);
  outGraph = addEdge(outGraph, right.tipID, joinID);
  // console.log({ colsToIndex });
  outGraph = addIndex(outGraph, left.tipID, varsToIndex);
  outGraph = addIndex(outGraph, right.tipID, varsToIndex);
  return {
    newGraph: outGraph,
    tipID: joinID,
    rec: left.rec, // ???
  };
}

function addRec(graph: RuleGraph, rec: Rec): AddConjunctResult {
  // TODO: probably should just add all of these globally...
  if (BUILTINS[rec.relation]) {
    const [graph2, builtinID] = addNode(graph, true, { type: "Builtin", rec });
    return {
      newGraph: graph2,
      rec,
      tipID: builtinID,
    };
  }
  const newNodeDesc: NodeDesc = {
    type: "Match",
    rec,
    mappings: {},
  };
  const [graph2, matchID] = addNode(graph, true, newNodeDesc);
  const graph3 = addEdge(graph2, rec.relation, matchID);
  return {
    newGraph: graph3,
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

type JoinTree =
  | {
      type: "Leaf";
      conjunct: Conjunct;
    }
  | {
      type: "Node";
      left: Conjunct;
      joinInfo: JoinInfo;
      right: JoinTree;
    };

function getJoinTree(conjuncts: Conjunct[]): JoinTree {
  if (conjuncts.length === 1) {
    return { type: "Leaf", conjunct: conjuncts[0] };
  }
  return {
    type: "Node",
    left: conjuncts[0],
    // are we joining with just the next record, or everything on the right?
    joinInfo: getJoinInfo(conjuncts[0], conjuncts[1]),
    right: getJoinTree(conjuncts.slice(1)),
  };
}

function numJoinsWithCommonVars(joinTree: JoinTree): number {
  if (joinTree.type === "Leaf") {
    return 0;
  }
  const thisDoes = Object.keys(joinTree.joinInfo.join).length > 0 ? 1 : 0;
  return thisDoes + numJoinsWithCommonVars(joinTree.right);
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
  const nodeID = graph.nextNodeID.toString();
  return [
    {
      ...graph,
      nextNodeID: graph.nextNodeID + 1,
      builtins:
        desc.type === "Builtin" ? graph.builtins.add(nodeID) : graph.builtins,
      nodes: graph.nodes.set(nodeID, {
        desc,
        cache: emptyIndexedCollection(),
        isInternal,
      }),
    },
    nodeID,
  ];
}

function addEdge(graph: RuleGraph, from: NodeID, to: NodeID): RuleGraph {
  return {
    ...graph,
    edges: graph.edges.update(from, List(), (destinations) =>
      destinations.push(to)
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
