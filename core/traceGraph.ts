import {
  Edge,
  Graph,
  recordLeaf,
  recordNode,
  RecordTree,
} from "../util/graphviz";
import { Tree } from "../util/tree";
import { allPairs, forEachPair, objToPairs } from "../util/util";
import {
  defaultTracePrintOpts,
  ppt,
  prettyPrintTermWithBindings,
} from "./pretty";
import {
  makeTermWithBindings,
  printTermWithBindings,
  traceToTree,
} from "./traceTree";
import { Res, TermWithBindings } from "./types";
import * as pp from "prettier-printer";

export function traceToGraph(res: Res): Graph {
  const tree = traceToTree(res);
  const graph: Graph = { edges: [], nodes: [] };
  treeToGraph(graph, tree);
  return graph;
}

function treeToGraph(graph: Graph, tree: Tree<Res>) {
  const termWithBindings = makeTermWithBindings(
    tree.item.term,
    tree.item.bindings
  );
  const idDoc = prettyPrintTermWithBindings(
    termWithBindings,
    [],
    defaultTracePrintOpts
  );
  const id = pp.render(100, idDoc);
  graph.nodes.push({
    id,
    attrs: {
      shape: "record",
      label: termToGraphvizRec(termWithBindings),
    },
  });
  // indices of terms that var shows up in
  const joinEdges: { [binding: string]: number[] } = {};
  Object.keys(tree.item.bindings).forEach;
  tree.children.forEach((child, childIdx) => {
    treeToGraph(graph, child);
    // add edges between children for joins
    forEachPair(child.item.bindings, (varName) => {
      if (!joinEdges[varName]) {
        joinEdges[varName] = [];
      }
      joinEdges[varName].push(childIdx);
    });
  });
  // add edges for mappings
  // TODO: DRY these up
  const trace = tree.item.trace;
  if (trace.type === "RefTrace") {
    const mappings = trace.mappings;
    forEachPair(mappings, (fromVar, toVar) => {
      joinEdges[fromVar].forEach((childIdx) => {
        const child = tree.children[childIdx];
        const childID = printTermWithBindings(
          child.item,
          [],
          defaultTracePrintOpts
        );
        graph.edges.push({
          from: { nodeID: id, port: fromVar },
          to: { nodeID: childID, port: toVar },
          attrs: { label: `${fromVar}:${toVar}` },
        });
      });
    });
  } else if (trace.type === "MatchTrace") {
    forEachPair(trace.fact.bindings, (varName) => {
      joinEdges[varName].forEach((childIdx) => {
        const child = tree.children[childIdx];
        const childID = printTermWithBindings(
          child.item,
          [],
          defaultTracePrintOpts
        );
        graph.edges.push({
          from: { nodeID: id, port: varName },
          to: { nodeID: childID, port: varName },
          attrs: { label: varName },
        });
      });
    });
  }
  forEachPair(joinEdges, (varName, childIndices) => {
    allPairs(childIndices).forEach(([fromIdx, toIdx]) => {
      const fromChild = tree.children[fromIdx].item;
      const toChild = tree.children[toIdx].item;
      // TODO: less duplicate printing of children...
      graph.edges.push({
        from: {
          nodeID: printTermWithBindings(fromChild, [], defaultTracePrintOpts),
          port: varName,
        },
        to: {
          nodeID: printTermWithBindings(toChild, [], defaultTracePrintOpts),
          port: varName,
        },
        attrs: { label: varName },
        mode: "undirected",
      });
    });
  });
}

function termToGraphvizRec(term: TermWithBindings): RecordTree {
  const inner = term.term;
  const bindingLabel = term.binding ? term.binding : "";
  switch (inner.type) {
    case "RecordWithBindings":
      return recordNode([
        recordNode([
          recordLeaf(bindingLabel, inner.relation),
          recordNode([
            recordNode(
              objToPairs(inner.attrs).map(([key, value]) =>
                recordNode([recordLeaf(null, key), termToGraphvizRec(value)])
              )
            ),
          ]),
        ]),
      ]);
    case "Atom":
      return recordLeaf(bindingLabel, ppt(inner.term));
    default:
      throw new Error(`todo: ${inner.type}`);
  }
}
