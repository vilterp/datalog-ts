import { AndClause, BinExpr, OrExpr, Rec, Rule } from "../types";
import {
  AddResult,
  EmissionBatch,
  EmissionLog,
  Insertion,
  JoinClause,
  JoinDesc,
  NodeAndCache,
  NodeDesc,
  NodeID,
  Res,
} from "./types";
import {
  extractBindings,
  getIndexKey,
  getIndexName,
  getJoinAttrs,
} from "./join";
import {
  appendToKey,
  filterMap,
  flatMap,
  mapObjToList,
  setUnion,
} from "../util";
import { substitute, unify, unifyVars } from "../unify";
import { IndexedCollection } from "./indexedCollection";
import Denque from "denque";
import { evalBinExpr } from "../binExpr";
import { Performance } from "w3c-hr-time";

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
        return this.doJoin(ins, nodeDesc);
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

  private doJoin(ins: Insertion, nodeDesc: JoinDesc): Res[] {
    // TODO: avoid linear-time stuff here
    const clauses = nodeDesc.joinClauses.filter(
      (c) => c.rec.relation !== ins.origin
    );
    const curClause = nodeDesc.joinClauses.find(
      (c) => c.rec.relation === ins.origin
    );
    const bindings = extractBindings(ins.res.term as Rec, curClause.joinVars);
    const res: Res = {
      term: ins.res.term,
      bindings,
    };
    return this.doJoinRecur(res, clauses, 0);
  }

  private doJoinRecur(
    res: Res,
    clauses: JoinClause[],
    clauseIndex: number
  ): Res[] {
    if (clauseIndex === clauses.length) {
      // TODO: some mappings / bindings?
      return [res];
    }
    const nextClause = clauses[clauseIndex];
    const nextRelationName = nextClause.rec.relation;
    const nextRelation = this.nodes[nextRelationName];
    const indexKey = getIndexKey(res.term as Rec, nextClause.colsToIndex);
    const results = nextRelation.cache.get(nextClause.indexName, indexKey);
    const totalResults: Res[] = [];
    for (let result of results) {
      const unifiedBindings = unifyVars(res.bindings, result.bindings);
      if (unifiedBindings !== null) {
        const nextRes: Res = {
          term: result.term,
          bindings: unifiedBindings,
        };
        const outputs = this.doJoinRecur(nextRes, clauses, clauseIndex + 1);
        for (let output of outputs) {
          totalResults.push(output);
        }
      }
    }
    return totalResults;
  }

  declareTable(name: string) {
    this.addNodeKnownID(name, false, { type: "BaseFactTable" });
  }

  addRule(rule: Rule): EmissionLog {
    // console.log("add", rule.head.relation);
    const substID = rule.head.relation;
    const { tipID: orID, newNodeIDs } = this.addOr(rule.head, rule.defn);
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
        for (let clause of nodeDesc.joinClauses) {
          const clauseResolved = this.checkClauseResolved(clause.rec);
          if (!clauseResolved) {
            resolved = false;
          }
        }
      }
    }
    // console.log("resolveUnmappedRule", { head: rule.head.relation, resolved });
    if (resolved) {
      this.removeUnmappedRule(rule.head.relation);
    }
  }

  private checkClauseResolved(clause: Rec): boolean {
    const callNode = this.nodes[clause.relation];
    if (!callNode) {
      // not defined yet
      return false;
    }
    const ruleNodeDesc = callNode.desc;
    if (ruleNodeDesc.type === "BaseFactTable") {
      // don't need to worry about mappings for base fact tables
      return true;
    }
    if (ruleNodeDesc.type !== "Substitute") {
      throw new Error("rule should be a Subst node");
    }
    return true;
  }

  private addOr(head: Rec, or: OrExpr): AddResult {
    if (or.opts.length === 1) {
      return this.addAnd(head, or.opts[0].clauses);
    }
    const orID = this.addNode(true, { type: "Union" });

    let outNodeIDs = new Set<NodeID>([orID]);
    for (let orOption of or.opts) {
      const { newNodeIDs, tipID: andID } = this.addAnd(head, orOption.clauses);
      this.addEdge(andID, orID);
      outNodeIDs = setUnion(outNodeIDs, newNodeIDs);
    }

    return {
      newNodeIDs: outNodeIDs,
      tipID: orID,
    };
  }

  private addAnd(head: Rec, clauses: AndClause[]): AddResult {
    const { recs, exprs } = extractBinExprs(clauses);
    const addResult = this.addJoin(head, recs);
    let tipID = addResult.tipID;
    const newNodeIDs = addResult.newNodeIDs;
    for (let expr of exprs) {
      const newExprID = this.addNode(true, {
        type: "BinExpr",
        expr,
      });
      this.addEdge(tipID, newExprID);
      newNodeIDs.add(newExprID);
      tipID = newExprID;
    }
    return {
      tipID,
      newNodeIDs,
    };
  }

  private addJoin(head: Rec, joinRecs: Rec[]): AddResult {
    // TODO: index by variable or something?
    const tipID = this.addNode(true, {
      type: "Join",
      head,
      joinClauses: joinRecs.map((rec) => {
        const joinAttrs = getJoinAttrs(rec);
        return {
          rec,
          joinVars: joinAttrs,
          indexName: getIndexName(Object.values(joinAttrs)),
          colsToIndex: Object.values(joinAttrs),
        };
      }),
    });
    for (let clause of joinRecs) {
      this.addEdge(clause.relation, tipID);
      const attrs = getJoinAttrs(clause);
      this.addIndex(clause.relation, Object.values(attrs));
    }
    return {
      tipID,
      newNodeIDs: new Set<NodeID>([tipID]),
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

  private addUnmappedRule(rule: Rule, newNodeIDs: Set<NodeID>) {
    this.unmappedRules[rule.head.relation] = { rule, newNodeIDs };
  }

  private addIndex(nodeID: NodeID, attrs: string[]) {
    this.nodes[nodeID].cache.createIndex(getIndexName(attrs), (res) => {
      // TODO: is this gonna be a perf bottleneck?
      // console.log({ attrs, res: ppt(res.term) });
      return getIndexKey(res.term as Rec, attrs);
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

export function extractBinExprs(
  clauses: AndClause[]
): { recs: Rec[]; exprs: BinExpr[] } {
  const recs: Rec[] = [];
  const exprs: BinExpr[] = [];
  clauses.forEach((clause) => {
    switch (clause.type) {
      case "BinExpr":
        exprs.push(clause);
        break;
      case "Record":
        recs.push(clause);
        break;
    }
  });
  return {
    recs,
    exprs,
  };
}
