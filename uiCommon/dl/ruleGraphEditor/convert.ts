import {
  Conjunct,
  Conjunction,
  PositionMap,
  rec,
  Rec,
  Rule,
  Term,
  varr,
} from "../../../core/types";
import { Point } from "../../../util/geom";
import {
  mapObj,
  mapObjToList,
  removeAtIdx,
  updateAtIdx,
} from "../../../util/util";
import {
  addEdge,
  addNode,
  combineGraphs,
  edgesFromNode,
  EMPTY_RULE_GRAPH,
  RuleGraph,
} from "./model";

// Rule => Graph

export function ruleToRuleGraphs(rule: Rule): RuleGraph[] {
  return rule.body.disjuncts.map((disjunct) =>
    conjunctionToGraph(rule.head, disjunct)
  );
}

export function conjunctionToGraph(
  head: Rec,
  conjunction: Conjunction
): RuleGraph {
  const bodyGraph = conjunction.conjuncts.reduce(
    (graph, conjunct, conjunctIndex) => {
      const { graph: conjunctGraph, id } = termToGraph(
        conjunct,
        [conjunctIndex.toString()],
        conjunction.positionMap
      );
      return combineGraphs(graph, conjunctGraph);
    },
    EMPTY_RULE_GRAPH
  );
  const { graph: headGraph } = termToGraph(
    head,
    ["head"],
    conjunction.positionMap
  );
  return combineGraphs(bodyGraph, headGraph);
}

const DEFAULT_POINT: Point = { x: 20, y: 20 };

function termToGraph(
  term: Term,
  path: string[],
  posMap: PositionMap
): { graph: RuleGraph; id: string } {
  switch (term.type) {
    case "Var": {
      const id = term.name;
      const graph: RuleGraph = {
        nodes: {
          [id]: {
            desc: { type: "JoinVar", name: term.name },
            pos: posMap[id] || DEFAULT_POINT,
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
        const { graph, id } = termToGraph(val, newPath, posMap);
        return addEdge(graph, {
          fromID: path.join("/"),
          toID: id,
          label: attrName,
        });
      });
      const attrsGraph = attrGraphs.reduce(combineGraphs, EMPTY_RULE_GRAPH);
      const isHead = curID === "head";
      return {
        graph: addNode(attrsGraph, curID, {
          desc: { type: "Relation", isHead, name: term.relation },
          pos: posMap[curID] || DEFAULT_POINT,
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
          pos: posMap[id] || DEFAULT_POINT,
        }),
        id,
      };
    }
    default:
      throw new Error(`case not supported: ${term.type}`);
  }
}

// Graph => Rule

export function editDisjunct(
  rule: Rule,
  index: number,
  newConjunction: Conjunction
): Rule {
  const newRule: Rule = {
    ...rule,
    body: {
      type: "Disjunction",
      disjuncts: updateAtIdx(rule.body.disjuncts, index, () => newConjunction),
    },
  };
  return newRule;
}

export function removeDisjunct(rule: Rule, index: number): Rule {
  return {
    ...rule,
    body: { ...rule.body, disjuncts: removeAtIdx(rule.body.disjuncts, index) },
  };
}

export function addDisjunct(rule: Rule): Rule {
  return {
    ...rule,
    body: {
      ...rule.body,
      disjuncts: [
        ...rule.body.disjuncts,
        { type: "Conjunction", conjuncts: [], positionMap: {} },
      ],
    },
  };
}

export function graphToConjunction(graph: RuleGraph): Conjunction {
  const conjuncts: Conjunct[] = [];
  for (let conjunctIndex = 0; ; conjunctIndex++) {
    const path = conjunctIndex.toString();
    const node = graph.nodes[path];
    if (!node) {
      break;
    }
    const term = graphToTerm(graph, path);
    conjuncts.push(term as Rec);
  }
  return {
    type: "Conjunction",
    conjuncts,
    positionMap: mapObj(graph.nodes, (id, node) => node.pos),
  };
}

function graphToTerm(graph: RuleGraph, pathStr: string): Term {
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
          attrs[edge.label] = term;
        });
        return rec(desc.name, attrs);
      }
    }
  })();
  return term;
}
