import {
  Conjunct,
  Conjunction,
  rec,
  Rec,
  Rule,
  Term,
  varr,
} from "../../../core/types";
import { Point } from "../../../util/geom";
import { arrayEq, mapObjToList, updateAtIdx } from "../../../util/util";
import {
  Edge,
  edgesFromNode,
  EMPTY_RULE_GRAPH,
  GraphNode,
  RuleGraph,
} from "./model";

// Rule => Graph

export function ruleToRuleGraphs(rule: Rule): RuleGraph[] {
  return rule.body.disjuncts.map((disjunct) =>
    disjunctToGraph(rule.head, disjunct)
  );
}

export function disjunctToGraph(
  head: Rec,
  conjunction: Conjunction
): RuleGraph {
  const bodyGraph = conjunction.conjuncts.reduce((graph, conjunct, idx) => {
    const { graph: conjunctGraph, id } = termToGraph(conjunct.inner, [
      idx.toString(),
    ]);
    return combineGraphs(graph, conjunctGraph);
  }, EMPTY_RULE_GRAPH);
  const { graph: headGraph } = termToGraph(head, ["head"]);
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
          [id]: {
            desc: { type: "JoinVar", name: term.name },
            pos: { x: 20, y: 20 },
          },
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
      const isHead = path.length === 1 && path[0] === "head";
      return {
        graph: addNode(attrsGraph, curID, {
          desc: { type: "Relation", isHead, name: term.relation },
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

// Graph => Rule

export function editDisjunct(
  rule: Rule,
  index: number,
  newGraph: RuleGraph
): Rule {
  const newRule: Rule = {
    ...rule,
    body: {
      type: "Disjunction",
      disjuncts: updateAtIdx(rule.body.disjuncts, index, () =>
        graphToConjunction(newGraph)
      ),
    },
  };
  console.log("editDisjunct", "newRule", newRule);
  return newRule;
}

function graphToConjunction(graph: RuleGraph): Conjunction {
  const conjuncts: Conjunct[] = [];
  for (let i = 0; ; i++) {
    const node = graph.nodes[i];
    if (!node) {
      break;
    }
    const { term, pos } = graphToTerm(graph, i.toString());
    conjuncts.push({
      inner: term as Rec,
      pos,
    });
  }
  return { type: "Conjunction", conjuncts };
}

function graphToTerm(
  graph: RuleGraph,
  pathStr: string
): { term: Term; pos: Point } {
  const curNode = graph.nodes[pathStr];
  const desc = curNode.desc;
  const term = (() => {
    switch (desc.type) {
      case "JoinVar":
        return varr(desc.name);
      case "Literal":
        return desc.value;
      case "Relation": {
        const outEdges = edgesFromNode(graph, pathStr);
        const attrs: { [attr: string]: Term } = {};
        outEdges.forEach((edge) => {
          const term = graphToTerm(graph, edge.toID);
          // actually should capture the pos here...
          attrs[edge.label] = term.term;
        });
        return rec(desc.name, attrs);
      }
    }
  })();
  return { term, pos: curNode.pos };
}
