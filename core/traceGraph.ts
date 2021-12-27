import { Graph, records, RecordTree } from "../util/graphviz";
import { Tree } from "../util/tree";
import { objToPairs } from "../util/util";
import { defaultTracePrintOpts, ppt } from "./pretty";
import { printTermWithBindings, traceToTree } from "./traceTree";
import { Rec, Res } from "./types";

export function traceToGraph(res: Res): Graph {
  const tree = traceToTree(res);
  const graph: Graph = { edges: [], nodes: [] };
  treeToGraph(graph, tree);
  return graph;
}

function treeToGraph(graph: Graph, tree: Tree<Res>) {
  const rec = tree.item.term as Rec;
  const id = printTermWithBindings(tree.item, [], defaultTracePrintOpts);
  graph.nodes.push({
    id,
    attrs: { shape: "record", label: records(recToGraphvizRec(rec)) },
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

function recToGraphvizRec(rec: Rec): RecordTree {
  return [
    { id: "rec", content: rec.relation },
    objToPairs(rec.attrs).map(([key, value]) => ({
      id: key,
      content: `${key}: ${ppt(value)}`,
    })),
  ];
}
