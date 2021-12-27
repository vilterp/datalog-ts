import { Graph } from "../util/graphviz";
import { ppt } from "./pretty";
import { collapseAndSources } from "./traceTree";
import { Res } from "./types";

export function traceToGraph(res: Res): Graph {
  const graph: Graph = { edges: [], nodes: [] };
  recur(graph, res);
  return graph;
}

function recur(graph: Graph, res: Res) {
  switch (res.trace.type) {
    case "AndTrace": {
      const id = ppt(res.term);
      graph.nodes.push({
        id,
        attrs: { label: `And: ${id}` },
      });
      collapseAndSources(res.trace.sources).forEach((source) => {
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
      const id = ppt(res.trace.match);
      graph.nodes.push({
        id,
        attrs: { label: `Match: ${id}` },
      });
      recur(graph, res.trace.fact);
      graph.edges.push({
        from: id,
        to: ppt(res.trace.fact.term),
        attrs: { label: "match" },
      });
      break;
    }
    case "RefTrace": {
      const id = ppt(res.trace.refTerm);
      graph.nodes.push({
        id,
        attrs: { label: `Ref: ${id}` },
      });
      recur(graph, res.trace.innerRes);
      // TODO: collapse and sources
      graph.edges.push({
        from: id,
        to: ppt(res.trace.innerRes.term),
        attrs: { label: "ref" },
      });
      break;
    }
    case "BaseFactTrace": {
      const id = ppt(res.term);
      graph.nodes.push({
        id,
        attrs: { label: `BaseFact: ${id}` },
      });
      break;
    }
    case "VarTrace": {
      graph.nodes.push({
        id: ppt(res.term),
        attrs: {},
      });
      break;
    }
    case "BinExprTrace": {
      graph.nodes.push({
        id: ppt(res.term),
        attrs: {},
      });
      break;
    }
    case "LiteralTrace": {
      graph.nodes.push({
        id: ppt(res.term),
        attrs: {},
      });
      break;
    }
  }
}
