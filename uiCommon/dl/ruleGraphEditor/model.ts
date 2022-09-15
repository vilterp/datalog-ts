import { Conjunction, Literal, Relation, Rule } from "../../../core/types";
import { alphabetToNum } from "../../../util/alphabet";
import { distance, Point } from "../../../util/geom";
import {
  filterMapObj,
  pairsToObj,
  removeAtIdx,
  removeKey,
} from "../../../util/util";
import { gatherVars, newConjunct, nextVar } from "./schemaUtils";

export type RuleGraph = {
  nodes: { [id: string]: GraphNode };
  edges: Edge[];
};

export const EMPTY_RULE_GRAPH: RuleGraph = {
  edges: [],
  nodes: {},
};

export type GraphNode = {
  pos: Point;
  desc: NodeDesc;
};

export type Edge = { fromID: string; toID: string; label: string };

export type NodeDesc =
  | { type: "JoinVar"; name: string }
  | { type: "Relation"; name: string; isHead: boolean }
  | { type: "Literal"; value: Literal };

export function updatePos(
  graph: RuleGraph,
  nodeID: string,
  newPos: Point
): RuleGraph {
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [nodeID]: {
        ...graph.nodes[nodeID],
        pos: newPos,
      },
    },
  };
}

export const JOIN_VAR_NODE_RADIUS = 10;

export function getOverlappingJoinVars(graph: RuleGraph, id: string): string[] {
  const fromNode = graph.nodes[id];
  if (fromNode.desc.type !== "JoinVar") {
    return [];
  }
  return Object.entries(graph.nodes)
    .filter(
      ([curID, curNode]) =>
        id !== curID &&
        curNode.desc.type === "JoinVar" &&
        distance(fromNode.pos, curNode.pos) < JOIN_VAR_NODE_RADIUS * 2
    )
    .map(([id, _]) => id);
}

export function combineNodes(
  graph: RuleGraph,
  draggingID: string,
  overlappingID: string
): RuleGraph {
  const [winningNode, losingNode] = draggingID.startsWith("head")
    ? [draggingID, overlappingID]
    : [overlappingID, draggingID];
  return {
    nodes: filterMapObj(graph.nodes, (key, val) => {
      if (key === losingNode) {
        return null;
      }
      return val;
    }),
    edges: graph.edges.map((edge) => ({
      fromID: edge.fromID === losingNode ? winningNode : edge.fromID,
      toID: edge.toID === losingNode ? winningNode : edge.toID,
      label: edge.label,
    })),
  };
}

export function combineGraphs(left: RuleGraph, right: RuleGraph): RuleGraph {
  return {
    nodes: {
      ...left.nodes,
      ...right.nodes,
    },
    edges: [...left.edges, ...right.edges],
  };
}

export function addEdge(graph: RuleGraph, edge: Edge): RuleGraph {
  return combineGraphs(graph, { nodes: {}, edges: [edge] });
}

export function addNode(
  graph: RuleGraph,
  id: string,
  node: GraphNode
): RuleGraph {
  return combineGraphs(graph, { nodes: { [id]: node }, edges: [] });
}

export function edgesFromNode(graph: RuleGraph, id: string): Edge[] {
  return graph.edges.filter((e) => e.fromID === id);
}

export function addConjunct(
  conjunction: Conjunction,
  rule: Rule,
  relations: Relation[],
  relationName: string
): Conjunction {
  const conjunctToAdd = newConjunct(relationName, rule, relations);
  const newID = conjunction.conjuncts.length;
  // TODO: set position of child nodes?
  return {
    type: "Conjunction",
    conjuncts: [...conjunction.conjuncts, conjunctToAdd],
    positionMap: { ...conjunction.positionMap, [newID]: { x: 250, y: 100 } },
  };
}

export function removeConjunct(
  conjunction: Conjunction,
  idx: number
): Conjunction {
  // TODO: remove from position map
  return { ...conjunction, conjuncts: removeAtIdx(conjunction.conjuncts, idx) };
}

export function splitUpVar(
  rule: Rule,
  graph: RuleGraph,
  toSplitID: string
): RuleGraph {
  const oldNode = graph.nodes[toSplitID];
  const existingVars = gatherVars(rule);
  const nextVarNum = alphabetToNum(nextVar(existingVars));
  const edgesToSplitNode = graph.edges.filter((edge) => edge.toID === toSplitID);
  const newNodes = edgesToSplitNode.map(())
  return {
    nodes: {
      ...graph.nodes,
      [toSplitID]: {
        ...oldNode,
        pos: { x: oldNode.pos.x, y: oldNode.pos.y - 15 },
      },
      ...newNodes,
    },
    // keep edges from head to the var
    edges: graph.edges.map((edge) => {
      // new var for each?
      if (edge.toID === toSplitID) {
        const fromNode = graph.nodes[edge.fromID];
        if (fromNode.desc.type === "Relation" && fromNode.desc.isHead) {
          return { ...edge, toID: toSplitID };
        } else {
          return { ...edge, toID: newVar };
        }
      }
      return edge;
    }),
  };
}
