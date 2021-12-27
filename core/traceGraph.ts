import { Graph } from "../util/graphviz";
import { ppt } from "./pretty";
import { Res } from "./types";

export function traceToGraph(tree: Res): Graph {
  const graph: Graph = { edges: [], nodes: [] };
  recur(graph, tree);
  return graph;
}

function recur(graph: Graph, tree: Res) {
  switch (tree.trace.type) {
    case "AndTrace": {
      const id = ppt(tree.term);
      graph.nodes.push({
        id,
        attrs: { label: `And: ${id}` },
      });
      tree.trace.sources.forEach((source) => {
        recur(graph, source);
        graph.edges.push({
          from: id,
          to: ppt(source.term),
          attrs: { label: "and" },
        });
      });
      break;
    }
    case "MatchTrace": {
      const id = ppt(tree.trace.match);
      graph.nodes.push({
        id,
        attrs: { label: `Match: ${id}` },
      });
      recur(graph, tree.trace.fact);
      graph.edges.push({
        from: id,
        to: ppt(tree.trace.fact.term),
        attrs: { label: "match" },
      });
      break;
    }
    case "RefTrace": {
      const id = ppt(tree.trace.refTerm);
      graph.nodes.push({
        id,
        attrs: { label: `Ref: ${id}` },
      });
      recur(graph, tree.trace.innerRes);
      graph.edges.push({
        from: id,
        to: ppt(tree.trace.innerRes.term),
        attrs: { label: "ref" },
      });
      break;
    }
    case "BaseFactTrace": {
      const id = ppt(tree.term);
      graph.nodes.push({
        id,
        attrs: { label: `BaseFact: ${id}` },
      });
      break;
    }
    case "VarTrace": {
      graph.nodes.push({
        id: ppt(tree.term),
        attrs: {},
      });
      break;
    }
    case "BinExprTrace": {
      graph.nodes.push({
        id: ppt(tree.term),
        attrs: {},
      });
      break;
    }
    case "LiteralTrace": {
      graph.nodes.push({
        id: ppt(tree.term),
        attrs: {},
      });
      break;
    }
  }
}
