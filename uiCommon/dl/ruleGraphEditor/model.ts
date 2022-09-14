import {
  Rec,
  Rule,
  Conjunct,
  Conjunction,
  Term,
  Literal,
} from "../../../core/types";
import { distance, Point } from "../../../util/geom";
import {
  filterMap,
  filterMapObj,
  mapObj,
  mapObjToList,
} from "../../../util/util";

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

type Edge = { fromID: string; toID: string; label: string };

export type NodeDesc =
  | { type: "JoinVar" }
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

export function ruleToRuleGraphs(rule: Rule): RuleGraph[] {
  return rule.body.disjuncts.map((disjunct) =>
    disjuctToGraph(rule.head, disjunct)
  );
}

function disjuctToGraph(head: Rec, conjunction: Conjunction): RuleGraph {
  const bodyGraph = conjunction.conjuncts.reduce((graph, conjunct, idx) => {
    const { graph: conjunctGraph, id } = termToGraph(conjunct.inner, [
      idx.toString(),
    ]);
    return combineGraphs(graph, conjunctGraph);
  }, EMPTY_RULE_GRAPH);
  const { graph: headGraph, id } = termToGraph(head, ["head"]);
  return combineGraphs(bodyGraph, headGraph);
}

function termToGraph(
  term: Term,
  path: string[]
): { graph: RuleGraph; id: string } {
  switch (term.type) {
    case "Var": {
      const id = term.name;
      const graph: RuleGraph = {
        nodes: {
          [id]: { desc: { type: "JoinVar" }, pos: { x: 20, y: 20 } },
        },
        edges: [],
      };
      return { id, graph };
    }
    case "Record": {
      const curID = path.join("/");
      const attrGraphs = mapObjToList(term.attrs, (attrName, val) => {
        const newPath = [...path, attrName];
        const { graph, id } = termToGraph(val, newPath);
        return addEdge(graph, {
          fromID: path.join("/"),
          toID: id,
          label: attrName,
        });
      });
      const attrsGraph = attrGraphs.reduce(combineGraphs, EMPTY_RULE_GRAPH);
      return {
        graph: addNode(attrsGraph, curID, {
          desc: { type: "Relation", isHead: false, name: term.relation },
          pos: { x: 20, y: 20 },
        }),
        id: curID,
      };
    }
    case "IntLit":
    case "StringLit":
    case "Bool": {
      const id = path.join("/");
      return {
        graph: addNode(EMPTY_RULE_GRAPH, id, {
          desc: { type: "Literal", value: term },
          pos: { x: 20, y: 20 },
        }),
        id,
      };
    }
    default:
      throw new Error(`case not supported: ${term.type}`);
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

function addEdge(graph: RuleGraph, edge: Edge): RuleGraph {
  return combineGraphs(graph, { nodes: {}, edges: [edge] });
}

function addNode(graph: RuleGraph, id: string, node: GraphNode): RuleGraph {
  return combineGraphs(graph, { nodes: { [id]: node }, edges: [] });
}
