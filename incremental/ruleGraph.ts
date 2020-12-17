import { AndClause, OrExpr, Rec, Rule, VarMappings } from "../types";
import {
  AddResult,
  PropagationStep,
  PropagationLog,
  Insertion,
  JoinDesc,
  MatchDesc,
  NodeAndCache,
  NodeDesc,
  NodeID,
  Res,
} from "./types";
import {
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
} from "../util/util";
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
import { ppr } from "./pretty";

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

  insertFact(rec: Rec): PropagationLog {
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
        if (ins.origin === nodeDesc.leftID) {
          return this.doJoin(ins, nodeDesc, nodeDesc.rightID);
        } else {
          return this.doJoin(ins, nodeDesc, nodeDesc.leftID);
        }
      }
      case "Match": {
        return doMatch(nodeDesc, ins);
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
  ): PropagationLog {
    // console.log("replayFacts", roots);
    let outPropagationLog: PropagationLog = [];
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
          const propagationLog = stepIteratorAll(iter);
          for (let emission of propagationLog) {
            outPropagationLog.push(emission);
          }
        }
      }
    }
    return outPropagationLog;
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
    otherNodeID: NodeID
  ): Res[] {
    const results: Res[] = [];
    const thisVars = ins.res.bindings;
    const otherNode = this.nodes[otherNodeID];
    // TODO: avoid this allocation
    const indexName = getIndexName(joinDesc.joinVars);
    const indexKey = getIndexKey(ins.res, joinDesc.joinVars);
    const otherEntries = otherNode.cache.get(indexName, indexKey);
    // console.log({
    //   indexName,
    //   indexKey,
    //   otherEntries,
    //   cache: otherNode.cache.toJSON(),
    // });
    const before = performance.now();
    for (let possibleOtherMatch of otherEntries) {
      const otherVars = possibleOtherMatch.bindings;
      const unifyRes = unifyVars(thisVars || {}, otherVars || {});
      // console.log("join", {
      //   left: formatRes(ins.res),
      //   right: formatRes(possibleOtherMatch),
      //   unifyRes: ppb(unifyRes),
      // });
      if (unifyRes !== null) {
        results.push({
          term: { ...(ins.res.term as Rec), relation: joinDesc.ruleName },
          bindings: unifyRes,
        });
      }
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

  addRule(rule: Rule): PropagationLog {
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
    newNodeIDs.add(substID);
    this.addEdge(orID, substID);
    this.addUnmappedRule(rule, newNodeIDs);
    const rulesJustMapped: Rule[] = [];
    for (let unmappedRuleName in this.unmappedRules) {
      const unmapped = this.unmappedRules[unmappedRuleName];
      const resolved = this.attemptResolveUnmappedRule(unmapped.newNodeIDs);
      if (resolved) {
        this.removeUnmappedRule(unmapped.rule.head.relation);
        rulesJustMapped.push(unmapped.rule);
      }
    }
    if (Object.keys(this.unmappedRules).length === 0) {
      const nodesToReplay = new Set([...flatMap(rulesJustMapped, getRoots)]);
      return this.replayFacts(newNodeIDs, nodesToReplay);
    }
    return [];
  }

  private addRec(rec: Rec): AddResult {
    const matchID = this.addNode(true, {
      type: "Match",
      rec,
      mappings: {},
    });
    this.addEdge(rec.relation, matchID);
    return {
      newNodeIDs: new Set([matchID]),
      rec,
      tipID: matchID,
    };
  }

  private attemptResolveUnmappedRule(newNodes: Set<NodeID>): boolean {
    // console.log("try resolving", rule.head.relation);
    let resolved = true;
    for (let newNodeID of newNodes) {
      const newNode = this.nodes[newNodeID];
      const nodeDesc = newNode.desc;
      if (nodeDesc.type === "Match") {
        const callRec = nodeDesc.rec;
        const callNode = this.nodes[callRec.relation];
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
        this.updateMappings(newNodeID, mappings);
      }
    }
    // console.log("attemptResolveUnmappedRule", { head: rule.head.relation, resolved });
    return resolved;
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
    const allJoinTrees = allRecPermutations.map((recs) => {
      const tree = getJoinTree(recs);
      return { tree, numCommonVars: numJoinsWithCommonVars(tree) };
    });
    allJoinTrees.sort((left, right) => {
      return left.numCommonVars - right.numCommonVars;
    });
    const joinTree = allJoinTrees[allJoinTrees.length - 1].tree;

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

  private addAndBinary(
    ruleName: string,
    left: Rec,
    right: Rec,
    rightID: NodeID
  ): AddResult {
    const joinInfo = getJoinInfo(left, right);
    const varsToIndex = Object.keys(joinInfo.join);
    const { newNodeIDs: nn1, tipID: leftID } = this.addRec(left);
    const joinID = this.addNode(true, {
      type: "Join",
      ruleName,
      joinVars: Object.keys(joinInfo.join),
      leftID,
      rightID,
    });
    this.addEdge(leftID, joinID);
    this.addEdge(rightID, joinID);
    // console.log({ colsToIndex });
    this.addIndex(leftID, varsToIndex);
    this.addIndex(rightID, varsToIndex);
    return {
      tipID: joinID,
      rec: left,
      newNodeIDs: setAdd(nn1, joinID),
    };
  }

  private addJoinTree(ruleName: string, joinTree: JoinTree): AddResult {
    if (joinTree.type === "Leaf") {
      return this.addRec(joinTree.rec);
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
    const node = this.nodes[from];
    if (node.desc.type === "Match") {
      node.desc.mappings = newMappings;
    }
  }

  private addUnmappedRule(rule: Rule, newNodeIDs: Set<NodeID>) {
    this.unmappedRules[rule.head.relation] = { rule, newNodeIDs };
  }

  private addIndex(nodeID: NodeID, varNames: string[]) {
    const node = this.nodes[nodeID];
    if (!node) {
      throw new Error(`can't add index to nonexistent node ${nodeID}`);
    }
    node.cache.createIndex(getIndexName(varNames), (res) => {
      // TODO: is this gonna be a perf bottleneck?
      // console.log({ attrs, res: ppt(res.term) });
      return getIndexKey(res, varNames);
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

function stepIteratorAll(iter: InsertionIterator): PropagationLog {
  const propagationLog: PropagationLog = [];
  while (iter.queue.length > 0) {
    const emissions = iter.step();
    propagationLog.push(emissions);
  }
  return propagationLog;
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

  step(): PropagationStep {
    // console.log("stepIterator", iter.queue);
    const insertingNow = this.queue.shift();
    const curNodeID = insertingNow.destination;
    const results = this.graph.processInsertion(insertingNow);
    for (let result of results) {
      if (this.mode.type === "Replaying") {
        console.log("replaying", {
          curNodeID,
          result: ppr(result),
          newNodeIDs: this.mode.newNodeIDs,
        });
      }
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
    return { insertion: insertingNow, output: results };
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
