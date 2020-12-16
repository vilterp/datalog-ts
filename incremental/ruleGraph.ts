import { AndClause, OrExpr, Rec, Rule, VarMappings } from "../types";
import {
  AddResult,
  AttrPath,
  EmissionBatch,
  EmissionLog,
  Insertion,
  JoinDesc,
  MatchDesc,
  NodeAndCache,
  NodeDesc,
  NodeID,
  Res,
  VarToPath,
} from "./types";
import {
  getBindings,
  getColsToIndex,
  getIndexKey,
  getIndexName,
  getJoinInfo,
  getJoinTree,
  JoinTree,
  numJoinsWithCommonVars,
} from "./build";
import {
  appendToKey,
  filterMap,
  flatMap,
  mapObjToList,
  permute,
  setAdd,
  setUnion,
} from "../util";
import {
  applyMappings,
  getMappings,
  substitute,
  unify,
  unifyVars,
} from "../unify";
import { extractBinExprs } from "../evalCommon";
import { IndexedCollection } from "./indexedCollection";
import Denque from "denque";
import { evalBinExpr } from "../binExpr";
import { Performance } from "w3c-hr-time";
import { ppb, ppt } from "../pretty";

const performance = new Performance();

export class RuleGraph {
  nextNodeID: number;
  nodes: { [nodeID: string]: NodeAndCache };
  edges: { [nodeID: string]: NodeID[] };
  unmappedRules: {
    [name: string]: { rule: Rule; newNodeIDs: Set<NodeID> };
  };

  constructor() {
    this.nextNodeID = 0;
    this.nodes = {};
    this.edges = {};
    this.unmappedRules = {};
  }

  insertFact(rec: Rec): EmissionLog {
    if (Object.keys(this.unmappedRules).length > 0) {
      throw new Error(
        `some rules still rely on things not defined yet: [${mapObjToList(
          this.unmappedRules,
          (name) => name
        ).join(", ")}]`
      );
    }

    const iter = this.getInsertionIterator(rec);
    return stepIteratorAll(iter);
  }

  private getInsertionIterator(rec: Rec): InsertionIterator {
    return new InsertionIterator(
      this,
      [
        {
          res: { term: rec, bindings: {} },
          origin: null,
          destination: rec.relation,
        },
      ],
      { type: "Playing" }
    );
  }

  processInsertion(ins: Insertion): Res[] {
    const node = this.nodes[ins.destination];
    if (!node) {
      throw new Error(`not found: node ${ins.destination}`);
    }
    const nodeDesc = node.desc;
    switch (nodeDesc.type) {
      case "Union":
        return [ins.res];
      case "Join": {
        console.log("ins", ins);
        if (ins.origin === nodeDesc.leftID) {
          return this.doJoin(
            ins,
            nodeDesc,
            nodeDesc.rightID,
            nodeDesc.joinInfo.leftVars,
            nodeDesc.indexes.left,
            nodeDesc.indexes.right
          );
        } else {
          return this.doJoin(
            ins,
            nodeDesc,
            nodeDesc.leftID,
            nodeDesc.joinInfo.rightVars,
            nodeDesc.indexes.right,
            nodeDesc.indexes.left
          );
        }
      }
      case "Substitute":
        const rec = substitute(nodeDesc.rec, ins.res.bindings);
        // console.log("substitute", {
        //   inBindings: ppb(ins.res.bindings),
        //   sub: ppt(nodeDesc.rec),
        //   out: ppt(rec),
        // });
        return [
          {
            term: rec,
            bindings: ins.res.bindings,
          },
        ];
      case "BinExpr":
        const result = evalBinExpr(nodeDesc.expr, ins.res.bindings);
        return result ? [ins.res] : [];
      case "BaseFactTable":
        return [ins.res];
    }
  }

  doQuery(query: Rec): Res[] {
    // TODO: use index selection
    const node = this.nodes[query.relation];
    if (!node) {
      // TODO: maybe start using result type
      throw new Error(`no such relation: ${query.relation}`);
    }
    return node.cache
      .all()
      .map((res) => {
        joinStats.queryUnifyCalls++;
        const bindings = unify({}, res.term, query);
        if (bindings === null) {
          return null;
        }
        return { term: res.term, bindings };
      })
      .filter((x) => x !== null);
  }

  addToCache(nodeID: NodeID, res: Res) {
    // TODO: mutating something in an immutable map is wonky
    this.nodes[nodeID].cache.insert(res);
  }

  clearCaches() {
    for (let nodeID of Object.keys(this.nodes)) {
      const node = this.nodes[nodeID];
      node.cache.clear();
    }
  }

  private replayFacts(
    allNewNodes: Set<NodeID>,
    roots: Set<NodeID>
  ): EmissionLog {
    // console.log("replayFacts", roots);
    let outEmissionLog: EmissionLog = [];
    for (let rootID of roots) {
      for (let res of this.nodes[rootID].cache.all()) {
        for (let destination of this.edges[rootID]) {
          const iter = this.getReplayIterator(allNewNodes, [
            {
              res,
              origin: rootID,
              destination,
            },
          ]);
          const emissionLog = stepIteratorAll(iter);
          for (let emission of emissionLog) {
            outEmissionLog.push(emission);
          }
        }
      }
    }
    return outEmissionLog;
  }

  private getReplayIterator(
    newNodeIDs: Set<NodeID>,
    queue: Insertion[]
  ): InsertionIterator {
    return new InsertionIterator(this, queue, {
      type: "Replaying",
      newNodeIDs,
    });
  }

  private doJoin(
    ins: Insertion,
    joinDesc: JoinDesc,
    otherNodeID: NodeID,
    thisVars: VarToPath,
    thisIndex: AttrPath[],
    otherIndex: AttrPath[]
  ): Res[] {
    const results: Res[] = [];
    const thisBindings = getBindings(ins.res.term as Rec, thisVars);
    console.log(ins.destination, "thisBindings", ppb(thisBindings));
    const otherNode = this.nodes[otherNodeID];
    const indexName = getIndexName(otherIndex);
    const indexKey = getIndexKey(ins.res.term as Rec, thisIndex);
    console.log("index", indexName, indexKey);
    const otherEntries = otherNode.cache.get(indexName, indexKey);
    const before = performance.now();
    for (let possibleOtherMatch of otherEntries) {
      const otherVars = possibleOtherMatch.bindings;
      const unifyRes = unifyVars(thisBindings || {}, otherVars || {});
      if (unifyRes !== null) {
        results.push({
          term: { ...(ins.res.term as Rec), relation: joinDesc.ruleName },
          bindings: unifyRes,
        });
      }
      console.log("unifyRes", ppb(unifyRes));
    }
    const after = performance.now();
    joinStats.inputRecords += otherEntries.length;
    joinStats.outputRecords += results.length;
    joinStats.joinTimeMS += after - before;
    return results;
  }

  declareTable(name: string) {
    this.addNodeKnownID(name, false, { type: "BaseFactTable" });
  }

  addRule(rule: Rule): EmissionLog {
    // console.log("add", rule.head.relation);
    const substID = rule.head.relation;
    const { tipID: orID, newNodeIDs } = this.addOr(
      rule.head.relation,
      rule.defn
    );
    this.addNodeKnownID(substID, false, {
      type: "Substitute",
      rec: rule.head,
    });
    newNodeIDs.add(substID); // TODO: weird mix of mutation and non-mutation here...?
    this.addEdge(orID, substID);
    this.addUnmappedRule(rule, newNodeIDs);
    for (let unmappedRuleName in this.unmappedRules) {
      const rule = this.unmappedRules[unmappedRuleName];
      this.resolveUnmappedRule(rule.rule, rule.newNodeIDs);
    }
    if (Object.keys(this.unmappedRules).length === 0) {
      const nodesToReplay = new Set([
        ...flatMap(
          Object.values(this.unmappedRules).map(({ rule }) => rule),
          getRoots
        ),
      ]);
      return this.replayFacts(newNodeIDs, nodesToReplay);
    }
    return [];
  }

  private resolveUnmappedRule(rule: Rule, newNodes: Set<NodeID>) {
    // console.log("try resolving", rule.head.relation);
    let resolved = true;
    for (let newNodeID of newNodes) {
      const newNode = this.nodes[newNodeID];
      const nodeDesc = newNode.desc;
      if (nodeDesc.type === "Join") {
        const colsToIndex = getColsToIndex(nodeDesc.joinInfo);
        if (!this.nodes[nodeDesc.leftID] || !this.nodes[nodeDesc.rightID]) {
          resolved = false;
          continue;
        }
        this.addIndex(nodeDesc.leftID, colsToIndex.left);
        this.addIndex(nodeDesc.rightID, colsToIndex.right);
      }
    }
    // console.log("resolveUnmappedRule", { head: rule.head.relation, resolved });
    if (resolved) {
      this.removeUnmappedRule(rule.head.relation);
    }
  }

  private addOr(ruleName: string, or: OrExpr): AddResult {
    if (or.opts.length === 1) {
      return this.addAnd(ruleName, or.opts[0].clauses);
    }
    const orID = this.addNode(true, { type: "Union" });

    let outNodeIDs = new Set<NodeID>([orID]);
    for (let orOption of or.opts) {
      const { newNodeIDs, tipID: andID } = this.addAnd(
        ruleName,
        orOption.clauses
      );
      this.addEdge(andID, orID);
      outNodeIDs = setUnion(outNodeIDs, newNodeIDs);
    }

    return {
      newNodeIDs: outNodeIDs,
      rec: null,
      tipID: orID,
    };
  }

  private addAnd(ruleName: string, clauses: AndClause[]): AddResult {
    const { recs, exprs } = extractBinExprs(clauses);
    const allRecPermutations = permute(recs);
    const allJoinTrees = allRecPermutations.map(getJoinTree);
    // TODO: cache these
    allJoinTrees.sort((left, right) => {
      return numJoinsWithCommonVars(left) - numJoinsWithCommonVars(right);
    });
    const joinTree = allJoinTrees[allJoinTrees.length - 1];

    const withJoinRes = this.addJoinTree(ruleName, joinTree);

    return exprs.reduce(({ tipID, newNodeIDs }, expr) => {
      const newExprID = this.addNode(true, {
        type: "BinExpr",
        expr,
      });
      this.addEdge(tipID, newExprID);
      return {
        tipID: newExprID,
        rec: null, // TODO: fix
        newNodeIDs: setAdd(newNodeIDs, newExprID),
      };
    }, withJoinRes);
  }

  private addJoinTree(ruleName: string, joinTree: JoinTree): AddResult {
    if (joinTree.type === "Leaf") {
      return {
        rec: joinTree.rec,
        newNodeIDs: new Set<NodeID>(),
        tipID: joinTree.rec.relation,
      };
    }
    const { tipID: rightID, rec: rightRec, newNodeIDs: nn1 } = this.addJoinTree(
      ruleName,
      joinTree.right
    );
    const { tipID: andID, newNodeIDs: nn2 } = this.addAndBinary(
      ruleName,
      joinTree.left,
      rightRec,
      rightID
    );
    return { tipID: andID, rec: joinTree.left, newNodeIDs: setUnion(nn1, nn2) };
  }

  private addAndBinary(
    ruleName: string,
    left: Rec,
    right: Rec,
    rightID: NodeID
  ): AddResult {
    const joinInfo = getJoinInfo(left, right);
    const colsToIndex = getColsToIndex(joinInfo);
    // const { newNodeIDs: nn1, tipID: leftID } = this.addRec(left);
    const leftID = left.relation;
    const joinID = this.addNode(true, {
      type: "Join",
      indexes: colsToIndex,
      joinInfo,
      ruleName,
      leftID,
      rightID,
    });
    this.addEdge(leftID, joinID);
    this.addEdge(rightID, joinID);
    // console.log({ colsToIndex });
    // TODO: do these later
    // this.addIndex(leftID, colsToIndex.left);
    // this.addIndex(rightID, colsToIndex.right);
    return {
      tipID: joinID,
      rec: left,
      newNodeIDs: new Set([joinID]),
    };
  }

  private addNode(isInternal: boolean, desc: NodeDesc): NodeID {
    const ret = `${this.nextNodeID}`;
    this.nodes[this.nextNodeID] = {
      desc,
      cache: new IndexedCollection<Res>(),
      isInternal,
    };
    this.nextNodeID++;
    return ret;
  }

  private updateMappings(from: NodeID, newMappings: VarMappings) {
    // TODO: add indexes
  }

  private addUnmappedRule(rule: Rule, newNodeIDs: Set<NodeID>) {
    this.unmappedRules[rule.head.relation] = { rule, newNodeIDs };
  }

  private addIndex(nodeID: NodeID, attrPaths: AttrPath[]) {
    this.nodes[nodeID].cache.createIndex(getIndexName(attrPaths), (res) => {
      // TODO: is this gonna be a perf bottleneck?
      // console.log({ attrs, res: ppt(res.term) });
      return getIndexKey(res.term as Rec, attrPaths);
    });
  }

  private addEdge(from: NodeID, to: NodeID) {
    appendToKey(this.edges, from, to);
  }

  private removeUnmappedRule(ruleName: string) {
    delete this.unmappedRules[ruleName];
  }

  private addNodeKnownID(id: NodeID, isInternal: boolean, desc: NodeDesc) {
    this.nodes[id] = {
      isInternal,
      desc,
      cache: new IndexedCollection<Res>(),
    };
  }
}

type IteratorMode =
  | { type: "Replaying"; newNodeIDs: Set<NodeID> }
  | { type: "Playing" };

function stepIteratorAll(iter: InsertionIterator): EmissionLog {
  const emissionLog: EmissionLog = [];
  while (iter.queue.length > 0) {
    const emissions = iter.step();
    emissionLog.push(emissions);
  }
  return emissionLog;
}

class InsertionIterator {
  graph: RuleGraph;
  queue: Denque<Insertion>;
  mode: IteratorMode;

  constructor(graph: RuleGraph, initialQueue: Insertion[], mode: IteratorMode) {
    this.graph = graph;
    this.queue = new Denque<Insertion>(initialQueue);
    this.mode = mode;
  }

  step(): EmissionBatch {
    // console.log("stepIterator", iter.queue);
    const insertingNow = this.queue.shift();
    const curNodeID = insertingNow.destination;
    const results = this.graph.processInsertion(insertingNow);
    for (let result of results) {
      if (this.mode.type === "Playing" || this.mode.newNodeIDs.has(curNodeID)) {
        this.graph.addToCache(curNodeID, result);
      }
      for (let destination of this.graph.edges[curNodeID] || []) {
        this.queue.push({
          destination,
          origin: curNodeID,
          res: result,
        });
      }
    }
    return { fromID: curNodeID, output: results };
  }
}

function doMatch(nodeDesc: MatchDesc, ins: Insertion): Res[] {
  const mappedBindings = applyMappings(nodeDesc.mappings, ins.res.bindings);
  joinStats.matchUnifyCalls++;
  const bindings = unify(mappedBindings, nodeDesc.rec, ins.res.term);
  if (bindings === null) {
    return [];
  }
  for (let key in bindings) {
    // console.log({ bindings, key });
    if (bindings[key].type === "Var") {
      return [];
    }
  }
  // console.log("match", {
  //   insRec: formatRes(ins.res),
  //   match: ppt(nodeDesc.rec),
  //   bindings: ppb(bindings || {}),
  //   mappings: ppVM(nodeDesc.mappings, [], { showScopePath: false }),
  //   mappedBindings: ppb(mappedBindings),
  // });
  return [
    {
      term: ins.res.term,
      bindings: bindings,
    },
  ];
}

type JoinStats = {
  joinTimeMS: number;
  inputRecords: number;
  outputRecords: number;

  matchUnifyCalls: number;
  queryUnifyCalls: number;
};

const emptyJoinStats = () => ({
  joinTimeMS: 0,
  inputRecords: 0,
  outputRecords: 0,
  matchUnifyCalls: 0,
  queryUnifyCalls: 0,
});

let joinStats: JoinStats = emptyJoinStats();

export function getJoinStats(): JoinStats & { outputPct: number } {
  const res = {
    ...joinStats,
    outputPct: (joinStats.outputRecords / joinStats.inputRecords) * 100,
  };
  clearJoinStats();
  return res;
}

function clearJoinStats() {
  joinStats = emptyJoinStats();
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
