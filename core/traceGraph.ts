import { Graph } from "../util/graphviz";
import { ppt } from "./pretty";
import { collapseAndSources } from "./traceTree";
import { Res } from "./types";

export function traceToGraph(res: Res): Graph {
  console.log({ res });
  const graph: Graph = { edges: [], nodes: [] };
  recur(graph, res);
  return graph;
}

const NODE_ATTRS = { shape: "box" };

function recur(graph: Graph, res: Res) {
  switch (res.trace.type) {
    case "AndTrace": {
      const id = ppt(res.term);
      graph.nodes.push({
        id,
        attrs: { label: `And: ${id}`, ...NODE_ATTRS },
      });
      collapseAndSources(res.trace.sources).forEach((source) => {
        recur(graph, source);
      });
      break;
    }
    case "MatchTrace": {
      recur(graph, res.trace.fact);
      break;
    }
    case "RefTrace": {
      const id = ppt(res.term);
      graph.nodes.push({
        id,
        attrs: { label: `Ref: ${id}`, ...NODE_ATTRS },
      });
      recur(graph, res.trace.innerRes);
      const innerRes = res.trace.innerRes;
      const edges =
        innerRes.trace.type === "AndTrace"
          ? collapseAndSources(innerRes.trace.sources)
          : [innerRes];
      edges.forEach((edge) => {
        graph.edges.push({
          from: id,
          to: ppt(edge.term),
          attrs: { label: "ref" },
        });
      });
      break;
    }
    case "BaseFactTrace": {
      const id = ppt(res.term);
      graph.nodes.push({
        id,
        attrs: { label: `BaseFact: ${id}`, ...NODE_ATTRS },
      });
      break;
    }
    case "VarTrace": {
      graph.nodes.push({
        id: ppt(res.term),
        attrs: NODE_ATTRS,
      });
      break;
    }
    case "BinExprTrace": {
      graph.nodes.push({
        id: ppt(res.term),
        attrs: NODE_ATTRS,
      });
      break;
    }
    case "LiteralTrace": {
      graph.nodes.push({
        id: ppt(res.term),
        attrs: NODE_ATTRS,
      });
      break;
    }
  }
}
