import {
  DiGraph,
  StronglyConnectedComponents,
  TopologicalSort,
} from "js-graph-algorithms";
import { DefaultDict } from "../../util/defaultDict";
import { Definitions, Rule, Term } from "../types";

export type StratifiedDefinitions = Definitions[];

export function getTopologicallyOrderedSCCs(
  definitions: Definitions
): StratifiedDefinitions {
  // get SCCs
  const { graph, index } = buildGraph(definitions);
  const sccs = new StronglyConnectedComponents(graph);
  // build condensation graph and recover rule names for SCCs
  const components = new DefaultDict<Definitions>(() => ({}));
  const condensation = new DiGraph(sccs.componentCount());
  for (const [relName, rel] of Object.entries(definitions)) {
    const ruleIdx = index[relName];
    const componentID = sccs.componentId(ruleIdx);
    components.get(componentID.toString())[relName] = rel;
    if (rel.type === "Rule") {
      const references = getReferences(rel.rule);
      references.forEach((target) => {
        const from = index[relName];
        const to = index[target];
        const fromComponent = sccs.componentId(from);
        const toComponent = sccs.componentId(to);
        condensation.addEdge(fromComponent, toComponent);
      });
    }
  }
  const topSort = new TopologicalSort(condensation);
  const order = topSort.order();
  return order.map((componentID) => components.get(componentID.toString()));
}

type GraphWithIndex = { graph: DiGraph; index: NameToIdx };

type NameToIdx = { [name: string]: number };

function buildGraph(definitions: Definitions): GraphWithIndex {
  // build index
  const nameToIndex: NameToIdx = {};
  const relationNames = Object.keys(definitions);
  relationNames.forEach((name, idx) => {
    nameToIndex[name] = idx;
  });
  // build graph
  const graph = new DiGraph(relationNames.length);
  for (const [relName, rel] of Object.entries(definitions)) {
    const fromIdx = nameToIndex[relName];
    if (rel.type === "Rule") {
      getReferences(rel.rule).forEach((ruleRef) => {
        const toIdx = nameToIndex[ruleRef];
        graph.addEdge(fromIdx, toIdx);
      });
    }
  }
  return { graph, index: nameToIndex };
}

function getReferences(rule: Rule): Set<string> {
  const out = new Set<string>();
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

function addTerm(references: Set<string>, term: Term) {
  if (term.type === "Record") {
    references.add(term.relation);
  }
}
