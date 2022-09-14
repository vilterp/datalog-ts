import { Rec, Rule, Conjunct, Conjunction, Term } from "../../../core/types";
import { distance, Point } from "../../../util/geom";
import {
  filterMap,
  filterMapObj,
  mapObj,
  mapObjToList,
} from "../../../util/util";

export type RuleGraph = {
  nodes: { [id: string]: GraphNode };
  edges: { fromID: string; toID: string }[];
};

export const EMPTY_RULE_GRAPH: RuleGraph = {
  edges: [],
  nodes: {},
};

export type GraphNode = {
  pos: Point;
  desc: NodeDesc;
};

export type NodeDesc =
  | { type: "JoinVar" }
  | { type: "Relation"; name: string; isHead: boolean };

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
    })),
  };
}

export function ruleToRuleGraphs(rule: Rule): RuleGraph[] {
  return rule.body.disjuncts.map((disjunct) =>
    disjuctToGraph(rule.head, disjunct)
  );
}

function disjuctToGraph(head: Rec, conjunction: Conjunction): RuleGraph {
  const bodyGraph = conjunction.conjuncts.reduce((graph, conjunct, idx) => {
    const conjunctGraph = termToGraph(conjunct.inner, [idx.toString()]);
    return combineGraphs(graph, conjunctGraph);
  }, EMPTY_RULE_GRAPH);
  const headGraph = termToGraph(head, ["head"]);
  return combineGraphs(bodyGraph, headGraph);
}

function termToGraph(term: Term, path: string[]): RuleGraph {
  switch (term.type) {
    case "Var":
      return {
        nodes: {
          [term.name]: { desc: { type: "JoinVar" }, pos: { x: 20, y: 20 } },
        },
        edges: [{ fromID: path.join("/"), toID: term.name }],
      };
    case "Record": {
      const attrGraphs = mapObjToList(term.attrs, (key, val) =>
        termToGraph(val, [...path, key])
      );
      const attrsGraph = attrGraphs.reduce(combineGraphs, EMPTY_RULE_GRAPH);
      return {
        nodes: {
          ...attrsGraph.nodes,
          [path.join("/")]: {
            desc: { type: "Relation", isHead: false, name: term.relation },
            pos: { x: 20, y: 20 },
          },
        },
        edges: attrsGraph.edges,
      };
    }
    default:
      return EMPTY_RULE_GRAPH;
  }
}

function combineGraphs(left: RuleGraph, right: RuleGraph): RuleGraph {
  return {
    nodes: {
      ...left.nodes,
      ...right.nodes,
    },
    edges: [...left.edges, ...right.edges],
  };
}
