import {
  DiGraph,
  StronglyConnectedComponents,
  TopologicalSort,
} from "js-graph-algorithms";
import { DefaultDict } from "../../util/defaultDict";
import { Rule, Term } from "../types";

export function getTopologicallyOrderedSCCs(
  rules: { [name: string]: Rule },
  tables: string[]
): { sccs: { [key: string]: string[] }; order: number[] } {
  // get SCCs
  const { graph, index } = buildGraph(rules, tables);
  const sccs = new StronglyConnectedComponents(graph);
  // build condensation graph and recover rule names for SCCs
  const components = new DefaultDict<string[]>(() => []);
  const condensation = new DiGraph(sccs.componentCount());
  for (const [ruleName, rule] of Object.entries(rules)) {
    const ruleIdx = index[ruleName];
    const componentID = sccs.componentId(ruleIdx);
    components.get(componentID.toString()).push(ruleName);
    const references = getReferences(rule);
    references.forEach((target) => {
      const from = index[ruleName];
      const to = index[target];
      const fromComponent = sccs.componentId(from);
      const toComponent = sccs.componentId(to);
      condensation.addEdge(fromComponent, toComponent);
    });
  }
  const topSort = new TopologicalSort(condensation);
  const order = topSort.order();
  return { sccs: components.toJSON(), order };
}

type GraphWithIndex = { graph: DiGraph; index: NameToIdx };

type NameToIdx = { [name: string]: number };

function buildGraph(
  rules: { [name: string]: Rule },
  tables: string[]
): GraphWithIndex {
  // build index
  const nameToIndex: NameToIdx = {};
  const relationNames = [...Object.keys(rules), ...tables];
  relationNames.forEach((name, idx) => {
    nameToIndex[name] = idx;
  });
  // build graph
  const graph = new DiGraph(relationNames.length);
  console.log("graph size:", graph.V, "index", nameToIndex);
  for (const [ruleName, rule] of Object.entries(rules)) {
    const fromIdx = nameToIndex[ruleName];
    getReferences(rule).forEach((ruleRef) => {
      const toIdx = nameToIndex[ruleRef];
      console.log("add edge", { ruleName, ruleRef, fromIdx, toIdx });
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
