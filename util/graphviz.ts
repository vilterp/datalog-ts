import * as pp from "prettier-printer";
import { mapObjToList } from "./util";

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  comments?: string[];
}

export interface Node {
  id: string;
  attrs: { [key: string]: string | RecordTree };
  comment?: string;
}

type EdgeID = string | { nodeID: string; port: string };

export interface Edge {
  from: EdgeID;
  to: EdgeID;
  attrs: { [key: string]: string };
  mode?: "directed" | "undirected";
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
            mapObjToList(node.attrs, (attr, attrValue) => [
              attr,
              "=",
              stringifyNodeAttrValue(attrValue),
            ])
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
            mapObjToList(maybeMarkUndirected(edge).attrs, (attr, attrValue) => [
              attr,
              "=",
              `"${escapeStr(attrValue)}"`,
            ])
          ),
          "];",
        ]),
      ],
      { sep: "" }
    ),
  ]);
}

function maybeMarkUndirected(edge: Edge): Edge {
  if (edge.mode && edge.mode === "undirected") {
    return { ...edge, attrs: { ...edge.attrs, dir: "none" } };
  }
  return edge;
}

// pretty utils

function stringifyEdgeID(id: EdgeID) {
  if (typeof id === "string") {
    return `"${escapeStr(id)}"`;
  }
  // TODO: can we quote and escape rowID too?
  return `"${escapeStr(id.nodeID)}":${id.port}`;
}

function escapeStr(str: string): string {
  return str.split('"').join('\\"');
}

function stringifyNodeAttrValue(value: string | RecordTree): string {
  if (typeof value === "string") {
    return `"${escapeStr(value)}"`;
  }
  return `"${escapeStr(stringifyRecordTree(value))}"`;
}

// constructor utils

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

// record format
// TODO: use tables instead of records

// e.g. https://graphviz.org/Gallery/directed/datastruct.html
// note: have to use with `shape: record`
// TODO: these can be nested, so they're really a tree

export function recordNode(children: RecordTree[]): RecordTree {
  return {
    type: "Node",
    children,
  };
}

export function recordLeaf(id: string, content: string): RecordTree {
  return {
    type: "Leaf",
    id,
    content,
  };
}

export type RecordTree =
  | {
      type: "Leaf";
      id: string | null;
      content: string;
    }
  | { type: "Node"; children: RecordTree[] };

function stringifyRecordTree(node: RecordTree): string {
  if (node.type === "Node") {
    return node.children
      .map((child) =>
        child.type === "Node"
          ? `{${stringifyRecordTree(child)}}`
          : stringifyRecordTree(child)
      )
      .join("|");
  }
  return node.id ? `<${node.id}> ${node.content}` : node.content;
}
