import {
  Rule,
  Rec,
  Disjunction,
  Conjunct,
  Aggregation,
  Bindings,
  VarToPath,
} from "../types";
import {
  RuleGraph,
  NodeDesc,
  NodeID,
  emptyRuleGraph,
  emptyAggregationState,
} from "./types";
import { permute } from "../../util/util";
import { ppb } from "../pretty";
import { List, Set } from "immutable";
import { emptyIndexedCollection } from "./indexedMultiSet";
import { fastPPR, fastPPT } from "../fastPPT";
import { BUILTINS } from "../builtins";
import { Catalog } from "./catalog";
import { prettyPrintGraph } from "../../util/graphviz";
import { toGraphviz } from "./graphviz";

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
  // console.log("graph", prettyPrintGraph(toGraphviz(graph)));
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

export function getJoinVars(left: Conjunct, right: Conjunct): Set<string> {
  const leftVars = Set(
    Object.keys(getVarToPath(left.type === "Record" ? left : left.record))
  );
  const rightVars = Set(
    Object.keys(getVarToPath(right.type === "Record" ? right : right.record))
  );

  return leftVars.intersect(rightVars);
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
    return addConjuncts(graph, or.disjuncts[0].conjuncts);
  }
  const [g1, orID] = addNode(graph, true, { type: "Union" });

  let outGraph = g1;
  for (let orOption of or.disjuncts) {
    const { newGraph, tipID: andID } = addConjuncts(
      outGraph,
      orOption.conjuncts
    );
    outGraph = addEdge(newGraph, andID, orID);
  }

  return {
    newGraph: outGraph,
    tipID: orID,
  };
}

type AddConjunctResult = {
  newGraph: RuleGraph;
  bindings: Set<string>;
  tipID: NodeID;
};

type GraphWithTip = {
  newGraph: RuleGraph;
  tipID: NodeID;
};

function addConjuncts(
  graph: RuleGraph,
  conjuncts: Conjunct[]
): AddConjunctResult {
  // add normal conjuncts
  const recs = conjuncts.filter((c) => c.type === "Record");
  const nonRecs = conjuncts.filter((c) => c.type !== "Record");
  const allRecPermutations = permute(recs);
  const allJoinTrees = allRecPermutations.map((permutation) => {
    const tree = getJoinTree(permutation);
    return { permutation, numCommonVars: numJoinsWithCommonVars(tree) };
  });
  allJoinTrees.sort((left, right) => {
    return left.numCommonVars - right.numCommonVars;
  });
  const winningPermuation =
    allJoinTrees.length > 0
      ? allJoinTrees[allJoinTrees.length - 1].permutation
      : [];
  const finalOrder = [...nonRecs, ...winningPermuation];
  return addJoinTree(graph, finalOrder);
}

function addJoinTree(
  graph: RuleGraph,
  conjuncts: Conjunct[]
): AddConjunctResult {
  if (conjuncts.length === 1 && conjuncts[0].type === "Negation") {
    throw new Error("can't have a single negation as the body");
  }

  const initResult: AddConjunctResult = {
    newGraph: graph,
    bindings: null,
    tipID: null,
  };
  return conjuncts.reduceRight((lastResult, conjunct) => {
    const withRec = addRec(lastResult.newGraph, getRecord(conjunct));
    switch (conjunct.type) {
      case "Record":
        if (lastResult.tipID === null) {
          return withRec;
        }
        return addJoin(withRec.newGraph, withRec, lastResult);
      case "Negation":
        if (lastResult.tipID === null) {
          throw new Error("can't have just a negation as the body");
        }
        return addNegation(lastResult, withRec);
      case "Aggregation":
        return addAggregation(withRec, conjunct);
    }
  }, initResult);
}

function getRecord(conjunct: Conjunct): Rec {
  switch (conjunct.type) {
    case "Record":
      return conjunct;
    case "Aggregation":
      return conjunct.record;
    case "Negation": {
      return conjunct.record;
    }
  }
}

function addNegation(
  prev: AddConjunctResult,
  withRec: AddConjunctResult
): AddConjunctResult {
  // TODO: this is one line in differential dataflow lol
  // https://github.com/TimelyDataflow/differential-dataflow/blob/c2e8fefce9ddad0aef5afcac0238b4dc6ae0ddcb/src/operators/join.rs#L181
  const [graph2, negID] = addNode(withRec.newGraph, true, {
    type: "Negation",
  });
  const graph3 = addEdge(graph2, withRec.tipID, negID);
  const {
    newGraph: graph4,
    tipID: joinID,
    bindings,
  } = addJoin(graph3, { ...withRec, tipID: negID }, prev);
  const [graph5, unionID] = addNode(graph4, true, { type: "Union" });
  const graph6 = addEdge(graph5, prev.tipID, unionID);
  const graph7 = addEdge(graph6, joinID, unionID);
  return {
    newGraph: graph7,
    bindings: bindings,
    tipID: unionID,
  };
}

function addAggregation(
  prev: GraphWithTip,
  aggregation: Aggregation
): AddConjunctResult {
  const [graph2, aggID] = addNode(prev.newGraph, true, {
    type: "Aggregation",
    aggregation,
    state: emptyAggregationState,
  });
  const graph3 = addEdge(graph2, prev.tipID, aggID);
  return {
    newGraph: graph3,
    bindings: Set(aggregation.varNames), // ??
    tipID: aggID,
  };
}

function addJoin(
  outGraph: RuleGraph,
  left: AddConjunctResult,
  right: AddConjunctResult
): AddConjunctResult {
  const joinVars = left.bindings.intersect(right.bindings);
  const [outGraph3, joinID] = addNode(outGraph, true, {
    type: "Join",
    joinVars,
    leftID: left.tipID,
    rightID: right.tipID,
  });
  outGraph = outGraph3;
  outGraph = addEdge(outGraph, left.tipID, joinID);
  outGraph = addEdge(outGraph, right.tipID, joinID);
  // console.log({ colsToIndex });
  outGraph = addIndex(outGraph, left.tipID, joinVars);
  outGraph = addIndex(outGraph, right.tipID, joinVars);
  return {
    newGraph: outGraph,
    tipID: joinID,
    bindings: left.bindings.union(right.bindings),
  };
}

function addRec(graph: RuleGraph, rec: Rec): AddConjunctResult {
  // TODO: probably should just add all of these globally...
  const bindings = Set(Object.keys(getVarToPath(rec)));
  if (BUILTINS[rec.relation]) {
    const [graph2, builtinID] = addNode(graph, true, { type: "Builtin", rec });
    return {
      newGraph: graph2,
      bindings,
      tipID: builtinID,
    };
  }
  const newNodeDesc: NodeDesc = {
    type: "Match",
    rec,
  };
  const [graph2, matchID] = addNode(graph, true, newNodeDesc);
  const graph3 = addEdge(graph2, rec.relation, matchID);
  return {
    newGraph: graph3,
    bindings,
    tipID: matchID,
  };
}

export function getIndexKey(
  bindings: Bindings,
  joinVars: Set<string>
): List<string> {
  return List(
    joinVars
      .toArray()
      .sort()
      .map((varName) => {
        const term = bindings[varName];
        if (!term) {
          throw new Error(
            `couldn't get attr "${varName}" of "${ppb(bindings)}"`
          );
        }
        return fastPPT(term);
      })
  );
}

export function getIndexName(joinVars: Set<string>): string {
  // TODO: some way to remove this sort
  return joinVars.toArray().sort().join("-");
}

type JoinTree =
  | {
      type: "Leaf";
      conjunct: Conjunct;
    }
  | {
      type: "Node";
      left: Conjunct;
      joinVars: Set<string>;
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
    joinVars: getJoinVars(conjuncts[0], conjuncts[1]),
    right: getJoinTree(conjuncts.slice(1)),
  };
}

function numJoinsWithCommonVars(joinTree: JoinTree): number {
  if (joinTree.type === "Leaf") {
    return 0;
  }
  const thisDoes = Object.keys(joinTree.joinVars).length > 0 ? 1 : 0;
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
      epochDone: -1,
      cache: emptyIndexedCollection(fastPPR),
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
        epochDone: -1,
        cache: emptyIndexedCollection(fastPPR),
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
  joinVars: Set<string>
): RuleGraph {
  return {
    ...graph,
    nodes: graph.nodes.update(nodeID, (node) => ({
      ...node,
      cache: node.cache.createIndex(getIndexName(joinVars), (bindings) => {
        // TODO: is this gonna be a perf bottleneck?
        // console.log({ attrs, res: ppt(res.term) });
        return getIndexKey(bindings.bindings, joinVars);
      }),
    })),
  };
}
