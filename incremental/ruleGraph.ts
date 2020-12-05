import { AndClause, OrExpr, Rec, Rule, VarMappings } from "../types";
import {
  AddResult,
  ColsToIndexByRelation,
  JoinInfo,
  NodeAndCache,
  NodeDesc,
  NodeID,
  Res,
} from "./types";
import {
  getColsToIndex,
  getIndexKey,
  getIndexName,
  getJoinInfo,
} from "./build";
import { appendToKey, setAdd, setUnion } from "../util";
import { getMappings } from "../unify";
import { extractBinExprs } from "../evalCommon";
import { IndexedCollection } from "./indexedCollection";

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

  declareTable(name: string) {
    this.addNodeKnownID(name, false, { type: "BaseFactTable" });
  }

  addJoin(ruleName: string, and: Rec[]): AddResult {
    if (and.length === 0) {
      throw new Error("empty and");
    }
    if (and.length === 1) {
      return this.addAndClause(and[0]);
    }
    const { tipID: rightID, newNodeIDs: nn1 } = this.addJoin(
      ruleName,
      and.slice(1)
    );
    const { tipID: andID, newNodeIDs: nn2 } = this.addAndBinary(
      ruleName,
      and[0],
      and[1],
      rightID
    );
    return { tipID: andID, newNodeIDs: setUnion(nn1, nn2) };
  }

  addAndClause(rec: Rec): AddResult {
    const matchID = this.addNode(true, {
      type: "Match",
      rec,
      mappings: {},
    });
    this.addEdge(rec.relation, matchID);
    return {
      newNodeIDs: new Set([matchID]),
      tipID: matchID,
    };
  }

  resolveUnmappedRule(rule: Rule, newNodes: Set<NodeID>) {
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
    // console.log("resolveUnmappedRule", { head: rule.head.relation, resolved });
    if (resolved) {
      this.removeUnmappedRule(rule.head.relation);
    }
  }

  addOr(ruleName: string, or: OrExpr): AddResult {
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
      tipID: orID,
    };
  }

  addAnd(ruleName: string, clauses: AndClause[]): AddResult {
    const { recs, exprs } = extractBinExprs(clauses);
    const withJoinRes = this.addJoin(ruleName, recs);
    return exprs.reduce(({ tipID, newNodeIDs }, expr) => {
      const newExprID = this.addNode(true, {
        type: "BinExpr",
        expr,
      });
      this.addEdge(tipID, newExprID);
      return {
        tipID: newExprID,
        newNodeIDs: setAdd(newNodeIDs, newExprID),
      };
    }, withJoinRes);
  }

  addAndBinary(
    ruleName: string,
    left: Rec,
    right: Rec,
    rightID: NodeID
  ): AddResult {
    const joinInfo = getJoinInfo(left, right);
    const colsToIndex = getColsToIndex(joinInfo);
    const { newNodeIDs: nn1, tipID: leftID } = this.addAndClause(left);
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
    this.addIndex(leftID, colsToIndex.left);
    this.addIndex(rightID, colsToIndex.right);
    return {
      tipID: joinID,
      newNodeIDs: setAdd(nn1, joinID),
    };
  }

  addNode(isInternal: boolean, desc: NodeDesc): NodeID {
    const ret = `${this.nextNodeID}`;
    this.nodes[this.nextNodeID] = {
      desc,
      cache: new IndexedCollection<Res>(),
      isInternal,
    };
    this.nextNodeID++;
    return ret;
  }

  updateMappings(from: NodeID, newMappings: VarMappings) {
    const node = this.nodes[from];
    if (node.desc.type === "Match") {
      node.desc.mappings = newMappings;
    }
  }

  addUnmappedRule(rule: Rule, newNodeIDs: Set<NodeID>) {
    this.unmappedRules[rule.head.relation] = { rule, newNodeIDs };
  }

  addIndex(nodeID: NodeID, attrs: string[]) {
    this.nodes[nodeID].cache.createIndex(getIndexName(attrs), (res) => {
      // TODO: is this gonna be a perf bottleneck?
      // console.log({ attrs, res: ppt(res.term) });
      return getIndexKey(res.term as Rec, attrs);
    });
  }

  addEdge(from: NodeID, to: NodeID) {
    appendToKey(this.edges, from, to);
  }

  removeUnmappedRule(ruleName: string) {
    delete this.unmappedRules[ruleName];
  }

  addNodeKnownID(id: NodeID, isInternal: boolean, desc: NodeDesc) {
    this.nodes[id] = {
      isInternal,
      desc,
      cache: new IndexedCollection<Res>(),
    };
  }
}
