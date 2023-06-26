import {
  Rule,
  Rec,
  Disjunction,
  Conjunct,
  Aggregation,
  Bindings,
} from "../types";
import {
  RuleGraph,
  NodeDesc,
  NodeID,
  emptyRuleGraph,
  emptyAggregationState,
} from "./types";
import { ppb } from "../pretty";
import { List, Set } from "immutable";
import { emptyIndexedMultiset, Key } from "./indexedMultiSet";
import { fastPPB, fastPPR, fastPPT } from "../fastPPT";
import { BUILTINS } from "../builtins";
import { Catalog } from "./catalog";
import { getJoinOrder, getRecord, getVarToPath } from "../joinOrder";

export function buildGraph(catalog: Catalog): RuleGraph {
  let graph = emptyRuleGraph();
  graph = catalog.reduce((accum, rel, relName) => {
    switch (rel.type) {
      case "Table":
        return declareTable(accum, relName);
      default:
        return accum;
    }
  }, graph);
  graph = catalog.reduce((accum, rel) => {
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
  let newGraph = graph;
  // add rule body
  const orRes = addOr(newGraph, rule.body);
  newGraph = orRes.newGraph;
  // add distinct
  const [withDistinct, distinctID] = addNode(newGraph, true, {
    type: "Distinct",
    state: emptyIndexedMultiset(fastPPB),
  });
  newGraph = withDistinct;
  newGraph = addEdge(newGraph, orRes.tipID, distinctID);
  // add subst
  const withSubst = addNodeKnownID(rule.head.relation, newGraph, false, {
    type: "Substitute",
    rec: rule.head,
  });
  return addEdge(withSubst, distinctID, rule.head.relation);
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
  // TODO: do we need to separate out negations & aggregations like this?
  const recs = conjuncts.filter((c) => c.type === "Record");
  const nonRecs = conjuncts.filter((c) => c.type !== "Record");
  const joinOrder = getJoinOrder(recs);
  const finalOrder = [...nonRecs, ...joinOrder];
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
    state: emptyAggregationState(),
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

export function getIndexKey(bindings: Bindings, joinVars: Set<string>): Key {
  return joinVars
    .toArray()
    .sort()
    .map((varName) => {
      const term = bindings[varName];
      if (!term) {
        throw new Error(`couldn't get attr "${varName}" of "${ppb(bindings)}"`);
      }
      return fastPPT(term);
    })
    .join(",");
}

export function getIndexName(joinVars: Set<string>): string {
  // TODO: some way to remove this sort
  return joinVars.toArray().sort().join("-");
}

// helpers

function addNodeKnownID(
  id: NodeID,
  graph: RuleGraph,
  isInternal: boolean,
  desc: NodeDesc
): RuleGraph {
  graph.nodes.set(id, {
    isInternal,
    desc,
    cache: emptyIndexedMultiset(fastPPR),
    lifetimeMessages: [],
  });
  return graph;
}

function addNode(
  graph: RuleGraph,
  isInternal: boolean,
  desc: NodeDesc
): [RuleGraph, NodeID] {
  const nodeID = graph.nextNodeID.toString();
  graph.nextNodeID += 1;
  graph.builtins =
    desc.type === "Builtin" ? graph.builtins.add(nodeID) : graph.builtins;
  graph.nodes.set(nodeID, {
    desc,
    cache: emptyIndexedMultiset(fastPPR),
    isInternal,
    lifetimeMessages: [],
  });
  return [graph, nodeID];
}

function addEdge(graph: RuleGraph, from: NodeID, to: NodeID): RuleGraph {
  graph.edges.updateWithDefault(from, [], (destinations) => {
    destinations.push(to);
    return destinations;
  });
  return graph;
}

function addIndex(
  graph: RuleGraph,
  nodeID: NodeID,
  joinVars: Set<string>
): RuleGraph {
  graph.nodes
    .get(nodeID)
    .cache.createIndex(getIndexName(joinVars), (bindings) => {
      // TODO: is this gonna be a perf bottleneck?
      // console.log({ attrs, res: ppt(res.term) });
      return getIndexKey(bindings.bindings, joinVars);
    });
  return graph;
}
