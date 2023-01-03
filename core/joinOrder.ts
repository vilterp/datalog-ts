import { Conjunct, Rec, VarToPath } from "./types";
import { DiGraph, TopologicalSort } from "js-graph-algorithms";
import { DefaultDict } from "../util/defaultDict";
import { Graph } from "../util/graphviz";

export function getJoinOrder(conjuncts: Conjunct[]): Conjunct[] {
  const [graph, entries] = getConjunctGraph(conjuncts);
  const topSort = new TopologicalSort(graph);
  const order = topSort.order();
  const out: Conjunct[] = [];
  for (const idx of order) {
    const entry = entries[idx];
    if (entry.type === "Conjunct") {
      out.push(entry.conjunct);
    }
  }
  return out;
}

type Entry =
  | { type: "Var"; name: string }
  | { type: "Conjunct"; conjunct: Conjunct };

export function getConjunctGraph(conjuncts: Conjunct[]): [DiGraph, Entry[]] {
  const varNameToIndex = new Map<string, number>();
  const edgesFromConjuncts = new DefaultDict<string[]>(() => []);
  const varEntries: Entry[] = [];
  conjuncts.forEach((conjunct, conjunctIdx) => {
    const varToPath = getVarToPath(getRecord(conjunct));
    for (const varName in varToPath) {
      if (!varNameToIndex.has(varName)) {
        varNameToIndex.set(varName, varNameToIndex.size);
        varEntries.push({ type: "Var", name: varName });
      }
      edgesFromConjuncts.get(conjunctIdx.toString()).push(varName);
    }
  });
  const graph = new DiGraph(conjuncts.length + varNameToIndex.size);
  conjuncts.forEach((_, idx) => {
    const edgesFrom = edgesFromConjuncts.get(idx.toString());
    edgesFrom.forEach((varName) => {
      graph.addEdge(idx, conjuncts.length + varNameToIndex.get(varName));
    });
  });
  const entries: Entry[] = [
    ...conjuncts.map((conjunct): Entry => ({ type: "Conjunct", conjunct })),
    ...varEntries,
  ];
  return [graph, entries];
}

export function getVarToPath(rec: Rec): VarToPath {
  const out: VarToPath = {};
  Object.entries(rec.attrs).forEach(([attr, attrVal]) => {
    switch (attrVal.type) {
      case "Var":
        out[attrVal.name] = [attr];
        break;
      case "Record":
        const subMapping = getVarToPath(attrVal);
        Object.entries(subMapping).forEach(([subVar, subPath]) => {
          out[subVar] = [attr, ...subPath];
        });
        break;
      // TODO: lists?
    }
  });
  return out;
}

export function getRecord(conjunct: Conjunct): Rec {
  switch (conjunct.type) {
    case "Record":
      return conjunct;
    case "Aggregation":
      return conjunct.record;
    case "Negation": {
      return conjunct.record;
    }
  }
}

export function joinGraphToGraphviz(graph: DiGraph, entries: Entry[]): Graph {
  const out: Graph = {
    nodes: [],
    edges: [],
  };
  for (let i = 0; i < graph.V; i++) {
    const entry = entries[i];
    switch (entry.type) {
      case "Var":
        out.nodes.push({ id: i.toString(), attrs: { label: entry.name } });
        break;
      case "Conjunct":
        out.nodes.push({
          id: i.toString(),
          // TODO: mark it as negation or aggregation
          attrs: { label: getRecord(entry.conjunct).relation },
        });
        break;
    }
  }
  for (let i = 0; i < graph.V; i++) {
    graph.adj(i).forEach((j) => {
      out.edges.push({ from: i.toString(), to: j.toString(), attrs: {} });
    });
  }
  return out;
}
