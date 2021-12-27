import { Graph, records } from "../util/graphviz";
import { objToPairs } from "../util/util";
import { defaultTracePrintOpts, ppt, ppVM } from "./pretty";
import { collapseAndSources, printTermWithBindings } from "./traceTree";
import { Rec, Res } from "./types";
import { termLT } from "./unify";

export function traceToGraph(res: Res): Graph {
  const graph: Graph = { edges: [], nodes: [] };
  recur(graph, res);
  return graph;
}

const NODE_ATTRS = { shape: "record" };

function recur(graph: Graph, res: Res) {
  // TODO: add binding edges
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
      const rec = res.term as Rec;
      graph.nodes.push({
        id,
        attrs: {
          label: records([
            { id: "rec", content: rec.relation },
            objToPairs(rec.attrs).map(([key, value]) => ({
              id: key,
              content: `${key}: ${ppt(value)}`,
            })),
          ]),
          ...NODE_ATTRS,
        },
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
