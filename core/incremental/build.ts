import {
  Rule,
  Rec,
  Disjunction,
  Conjunct,
  VarMappings,
  Res,
  Negation,
  Aggregation,
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

type AddResult = {
  newGraph: RuleGraph;
  rec: Rec | null;
  tipID: NodeID;
};

function addOr(graph: RuleGraph, or: Disjunction): AddResult {
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
    rec: null, // ???
    tipID: orID,
  };
}

function addAnd(graph: RuleGraph, clauses: Conjunct[]): AddResult {
  // add normal conjuncts
  const recs = clauses.filter((clause) => clause.type === "Record") as Rec[];
  const allRecPermutations = permute(recs);
  const allJoinTrees = allRecPermutations.map((recs) => {
    const tree = getJoinTree(recs);
    return { tree, numCommonVars: numJoinsWithCommonVars(tree) };
  });
  allJoinTrees.sort((left, right) => {
    return left.numCommonVars - right.numCommonVars;
  });
  const joinTree = allJoinTrees[allJoinTrees.length - 1].tree;
  const withJoinTree = addJoinTree(graph, joinTree);

  // add negations
  const negations = clauses.filter((conjuct) => conjuct.type === "Negation");
  const withNegations = negations.reduce(
    (accum, negation) => addNegation(accum, negation as Negation),
    withJoinTree
  );

  // add aggregations
  const aggregations = clauses.filter(
    (conjunct) => conjunct.type === "Aggregation"
  );
  const withAggregations = aggregations.reduce(
    (accum, aggregation) => addAggregation(accum, aggregation as Aggregation),
    withNegations
  );

  return withAggregations;
}

function addNegation(result: AddResult, negation: Negation): AddResult {
  const graph0 = result.newGraph;
  const [graph1, negationID] = addNode(graph0, true, {
    type: "Negation",
    rec: negation.record,
    received: 0,
  });
  const [graph2, matchID] = addNode(graph1, true, {
    type: "Match",
    rec: negation.record,
    mappings: {},
  });
  const graph3 = addEdge(graph2, negation.record.relation, matchID);
  const graph4 = addEdge(graph3, matchID, negationID);
  const joinInfo = getJoinInfo(negation.record, result.rec);
  const [graph5, joinID] = addNode(graph4, true, {
    type: "Join",
    joinVars: Object.keys(joinInfo.join),
    leftID: negationID,
    rightID: result.tipID,
  });
  const graph6 = addEdge(graph5, negationID, joinID);
  const graph7 = addEdge(graph6, result.tipID, joinID);
  return {
    newGraph: graph7,
    rec: null,
    tipID: joinID,
  };
}

function addAggregation(
  result: AddResult,
  aggregation: Aggregation
): AddResult {
  const [graph1, aggID] = addNode(result.newGraph, true, {
    type: "Aggregation",
    aggregation,
  });
  const graph2 = addEdge(graph1, result.tipID, aggID);
  return {
    newGraph: graph2,
    rec: null,
    tipID: aggID,
  };
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
  const { newGraph: outGraph2, tipID: leftID } = addRec(outGraph, left);
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
  } = addJoinTree(ruleGraph, joinTree.right);
  const { newGraph: newGraph2, tipID: andID } = addAndBinary(
    newGraph,
    joinTree.left,
    rightRec,
    rightID
  );
  return {
    newGraph: newGraph2,
    tipID: andID,
    rec: joinTree.left,
  };
}

function addRec(graph: RuleGraph, rec: Rec): AddResult {
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
      rec: Rec;
    }
  | { type: "Node"; left: Rec; joinInfo: JoinInfo; right: JoinTree | null };

function getJoinTree(recs: Rec[]): JoinTree {
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
