import { DiGraph, StronglyConnectedComponents } from "js-graph-algorithms";
import { DefaultDict } from "../../util/defaultDict";
import { Rule, Term } from "../types";

// TODO: top sort SCCs

function getSCCs(
  rules: { [name: string]: Rule },
  tables: string[]
): DefaultDict<string[]> {
  const { graph, index } = buildGraph(rules, tables);
  const sccs = new StronglyConnectedComponents(graph);
  const components = new DefaultDict<string[]>(() => []);
  for (const ruleName in index) {
    const ruleIdx = index[ruleName];
    const componentID = sccs.componentId(ruleIdx);
    components.get(componentID.toString()).push(ruleName);
  }
  return components;
}

type GraphWithIndex = { graph: DiGraph; index: NameToIdx };

type NameToIdx = { [name: string]: number };

function buildGraph(
  rules: { [name: string]: Rule },
  tables: string[]
): GraphWithIndex {
  const nameToIndex: NameToIdx = {};
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
  return { graph, index: nameToIndex };
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
