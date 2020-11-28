import { RuleGraph, NodeDesc, formatDesc, formatRes } from "./types";
import { Graph } from "../graphviz";
import { mapObjToList, flatMapObjToList } from "../util";
import {
  ppRule,
  ppt,
  ppVM,
  prettyPrintBinExpr,
  prettyPrintTerm,
} from "../pretty";
import * as pp from "prettier-printer";

export function toGraphviz(graph: RuleGraph): Graph {
  return {
    nodes: mapObjToList(graph.nodes, (id, node) => {
      return {
        id,
        attrs: {
          shape: "box",
          label: `${id}: ${formatDesc(node.desc)}`,
        },
        comment:
          node.cache.length > 0
            ? `cache: [${node.cache.map((res) => formatRes(res)).join(", ")}]`
            : "",
      };
    }),
    edges: flatMapObjToList(graph.edges, (fromID, destinations) =>
      destinations.map((dst) => ({
        from: fromID,
        to: dst,
        attrs: {},
      }))
    ),
    comments:
      Object.keys(graph.unmappedRules).length > 0
        ? mapObjToList(
            graph.unmappedRules,
            (name, rule) =>
              `unmapped: ${name} [${[...rule.newNodeIDs].join(", ")}]`
          )
        : [],
  };
}
