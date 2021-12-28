import {
  Edge,
  Graph,
  recordLeaf,
  recordNode,
  RecordTree,
} from "../util/graphviz";
import { Tree } from "../util/tree";
import { allPairs, forEachPair, mapObj, objToPairs } from "../util/util";
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
    const childID = printTermWithBindings(
      child.item,
      [],
      defaultTracePrintOpts
    );
    // add edges between children for joins
    forEachPair(child.item.bindings, ([varName]) => {
      if (!joinEdges[varName]) {
        joinEdges[varName] = [];
      }
      joinEdges[varName].push(childIdx);
    });
    // add edges for conjuncts
    // TODO: just for mappings
    graph.edges.push({
      from: id,
      to: childID,
      attrs: {},
    });
  });
  objToPairs(joinEdges).forEach(([varName, childIndices]) => {
    allPairs(childIndices).forEach(([fromIdx, toIdx]) => {
      const fromChild = tree.children[fromIdx].item;
      const toChild = tree.children[toIdx].item;
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
        recordLeaf(bindingLabel, inner.relation),
        recordNode(
          objToPairs(inner.attrs).map(([key, value]) =>
            recordNode([recordLeaf(null, key), termToGraphvizRec(value)])
          )
        ),
      ]);
    case "Atom":
      return recordLeaf(bindingLabel, ppt(inner.term));
    default:
      throw new Error(`todo: ${inner.type}`);
  }
}
