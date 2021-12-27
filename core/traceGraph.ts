import { Graph } from "../util/graphviz";
import { defaultTracePrintOpts, ppt, ppVM } from "./pretty";
import { collapseAndSources, printTermWithBindings } from "./traceTree";
import { Res } from "./types";

export function traceToGraph(res: Res): Graph {
  const graph: Graph = { edges: [], nodes: [] };
  recur(graph, res);
  return graph;
}

const NODE_ATTRS = { shape: "box" };

function recur(graph: Graph, res: Res) {
  switch (res.trace.type) {
    case "AndTrace": {
      collapseAndSources(res.trace.sources).forEach((source) => {
        recur(graph, source);
      });
      break;
    }
    case "MatchTrace": {
      const id = printTermWithBindings(res, [], defaultTracePrintOpts);
      graph.nodes.push({
        id,
        attrs: { ...NODE_ATTRS },
      });
      break;
    }
    case "RefTrace": {
      const id = printTermWithBindings(res, [], {
        showScopePath: false,
      });
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
      const mappings = res.trace.mappings;
      edges.forEach((edge) => {
        graph.edges.push({
          from: id,
          to: printTermWithBindings(edge, [], defaultTracePrintOpts),
          attrs: { label: `ref: ${ppVM(mappings, [], defaultTracePrintOpts)}` },
        });
      });
      break;
    }
    default:
      throw new Error(`traces of type ${res.trace.type} shouldn't be reached`);
  }
}
