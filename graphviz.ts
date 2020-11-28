import * as pp from "prettier-printer";
import { mapObjToList } from "./util";

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  comments?: string[];
}

interface Node {
  id: string;
  attrs: { [key: string]: string };
  comment?: string;
}

interface Edge {
  from: string;
  to: string;
  attrs: { [key: string]: string };
}

function hasEdgesToOrFrom(g: Graph, id: string) {
  return g.edges.some((e) => e.from === id || e.to === id);
}

export function removeOrphanNodes(g: Graph): Graph {
  return {
    nodes: g.nodes.filter((node) => hasEdgesToOrFrom(g, node.id)),
    edges: g.edges,
  };
}

export function prettyPrintGraph(g: Graph): string {
  return pp.render(100, [
    "digraph G ",
    block(
      pp.braces,
      [
        ...(g.comments || []).map((comment) => `// ${comment}`),
        ...g.nodes.map((node) => [
          `"${node.id}"`,
          " [",
          pp.intersperse(
            " ",
            mapObjToList(node.attrs, (k, v) => [k, "=", `"${v}"`])
          ),
          "]",
          node.comment ? ` // ${node.comment}` : "",
        ]),
        ...g.edges.map((edge) => [
          `"${edge.from}"`,
          " -> ",
          `"${edge.to}"`,
          " [",
          pp.intersperse(
            " ",
            mapObjToList(edge.attrs, (k, v) => [k, "=", `"${v}"`])
          ),
          "]",
        ]),
      ],
      { sep: "" }
    ),
  ]);
}

// pretty util

interface BlockOpts {
  sep: string;
}

export function block(
  pair: [pp.IDoc, pp.IDoc],
  docs: pp.IDoc[],
  opts?: BlockOpts
): pp.IDoc {
  if (docs.length === 0) {
    return [pair[0], pair[1]];
  }
  return [pair[0], blockInner(docs, opts), pair[1]];
}

export function blockInner(docs: pp.IDoc[], opts?: BlockOpts): pp.IDoc {
  const sep = opts ? opts.sep : ",";
  return pp.choice(pp.intersperse(`${sep} `)(docs), [
    pp.lineBreak,
    pp.indent(2, pp.intersperse([sep, pp.lineBreak])(docs)),
    pp.lineBreak,
  ]);
}
