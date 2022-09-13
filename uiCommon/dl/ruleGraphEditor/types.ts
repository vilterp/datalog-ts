export type RuleGraph = {
  nodes: { [id: string]: GraphNode };
  edges: { fromID: string; toID: string }[];
};

type GraphNode = {
  pos: Point;
  desc: NodeDesc;
};

export type NodeDesc = { type: "JoinVar" } | { type: "Relation"; name: string };

export type Point = { x: number; y: number };
