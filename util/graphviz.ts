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

type EdgeID = string | { nodeID: string; rowID: string };

interface Edge {
  from: EdgeID;
  to: EdgeID;
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
          `"${escapeStr(node.id)}"`,
          " [",
          pp.intersperse(
            " ",
            mapObjToList(node.attrs, (k, v) => [k, "=", `"${escapeStr(v)}"`])
          ),
          "];",
          node.comment ? ` // ${node.comment}` : "",
        ]),
        ...g.edges.map((edge) => [
          stringifyEdgeID(edge.from),
          " -> ",
          stringifyEdgeID(edge.to),
          " [",
          pp.intersperse(
            " ",
            mapObjToList(edge.attrs, (k, v) => [k, "=", `"${escapeStr(v)}"`])
          ),
          "];",
        ]),
      ],
      { sep: "" }
    ),
  ]);
}

// pretty util

function stringifyEdgeID(id: EdgeID) {
  if (typeof id === "string") {
    return `"${escapeStr(id)}"`;
  }
  // TODO: can we quote and escape rowID too?
  return `"${escapeStr(id.nodeID)}":${id.rowID}`;
}

function escapeStr(str: string): string {
  return str.split('"').join('\\"');
}

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

// e.g. https://graphviz.org/Gallery/directed/datastruct.html
// note: have to use with `shape: record`
export function records(rows: { id: string; content: string }[]) {
  return rows.map((row) => `<${row.id}> ${row.content}`).join("|");
}
