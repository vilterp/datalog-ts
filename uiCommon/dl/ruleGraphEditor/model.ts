import { distance, Point } from "../../../util/geom";
import { filterMap, filterMapObj, mapObj } from "../../../util/util";

export type RuleGraph = {
  nodes: { [id: string]: GraphNode };
  edges: { fromID: string; toID: string }[];
};

type GraphNode = {
  pos: Point;
  desc: NodeDesc;
};

export type NodeDesc = { type: "JoinVar" } | { type: "Relation"; name: string };

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

export function getOverlapping(graph: RuleGraph, id: string): string[] {
  const fromNode = graph.nodes[id];
  return Object.entries(graph.nodes)
    .filter(
      ([curID, curNode]) =>
        id !== curID &&
        distance(fromNode.pos, curNode.pos) < JOIN_VAR_NODE_RADIUS
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
    })),
  };
}
