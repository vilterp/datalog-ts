import { Graph, recordLeaf, recordNode, RecordTree } from "../util/graphviz";
import { Tree } from "../util/tree";
import { objToPairs } from "../util/util";
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
import { InnerTermWithBindings, Res, TermWithBindings } from "./types";
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
  tree.children.forEach((child) => {
    treeToGraph(graph, child);
    graph.edges.push({
      from: id,
      to: printTermWithBindings(child.item, [], defaultTracePrintOpts),
      attrs: {},
    });
  });
}

function termToGraphvizRec(term: TermWithBindings): RecordTree {
  // TODO: show binding
  return innerTermWithBindingsToGraphvizRec(term.term);
}

function innerTermWithBindingsToGraphvizRec(term: InnerTermWithBindings) {
  switch (term.type) {
    case "RecordWithBindings":
      return recordNode([
        recordLeaf(null, term.relation),
        recordNode(
          objToPairs(term.attrs).map(([key, value]) =>
            recordNode([recordLeaf(null, key), termToGraphvizRec(value)])
          )
        ),
      ]);
    case "Atom":
      return recordLeaf(null, ppt(term.term));
    default:
      throw new Error(`todo: ${term.type}`);
  }
}
