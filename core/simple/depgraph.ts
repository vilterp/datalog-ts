import { DiGraph } from "js-graph-algorithms";
import { Rule, Term } from "../types";

function buildGraph(
  rules: { [name: string]: Rule },
  tables: string[]
): DiGraph {
  const nameToIndex: { [name: string]: number } = {};
  const relationNames = [...Object.keys(rules), ...tables];
  relationNames.forEach((name, idx) => {
    nameToIndex[name] = idx;
  });
  const graph = new DiGraph(relationNames.length);
  for (const [ruleName, rule] of Object.entries(rules)) {
    const fromIdx = nameToIndex[ruleName];
    getReferences(rule).forEach((ruleRef) => {
      const toIdx = nameToIndex[ruleRef];
      graph.addEdge(fromIdx, toIdx);
    });
  }
  return graph;
}

function getReferences(rule: Rule): string[] {
  const out: string[] = [];
  rule.body.disjuncts.forEach((disjunct) => {
    disjunct.conjuncts.forEach((conjunct) => {
      switch (conjunct.type) {
        case "Aggregation":
          addTerm(out, conjunct.record);
          break;
        case "Negation":
          addTerm(out, conjunct.record);
          break;
        case "Record":
          addTerm(out, conjunct);
          break;
      }
    });
  });
  return out;
}

function addTerm(references: string[], term: Term) {
  if (term.type === "Record") {
    references.push(term.relation);
  }
}
