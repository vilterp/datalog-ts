import { Literal } from "../../../core/types";
import { distance, Point } from "../../../util/geom";
import { filterMapObj } from "../../../util/util";

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
  return {
    nodes: filterMapObj(graph.nodes, (key, val) => {
      if (key === overlappingID) {
        return null;
      }
      return val;
    }),
    edges: graph.edges.map((edge) => ({
      fromID: edge.fromID === overlappingID ? draggingID : edge.fromID,
      toID: edge.toID === overlappingID ? draggingID : edge.toID,
      label: edge.label,
    })),
  };
}

export function edgesFromNode(graph: RuleGraph, id: string): Edge[] {
  return graph.edges.filter((e) => e.fromID === id);
}
