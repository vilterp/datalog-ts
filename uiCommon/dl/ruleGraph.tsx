import { Rule, Term } from "../../core/types";
import { Graph, RecordTree } from "../../util/graphviz";
import { flatMap } from "../../util/util";

export function ruleToGraph(rule: Rule): Graph {
  return {
    nodes: [
      {
        id: "head",
        attrs: { shape: "record", label: termToRecordTree(rule.head) },
      },
      ...flatMap(rule.body.opts, (andExpr) =>
        flatMap(andExpr.clauses, (clause) =>
          clause.type === "BinExpr" ? [] : [termToRecordTree(clause)]
        )
      ).map((recTree, idx) => ({
        id: `${idx}`,
        attrs: { shape: "record", label: recTree },
      })),
    ],
    edges: [],
  };
}

function termToRecordTree(term: Term): RecordTree {
  return termToNodeRecur(term, []);
}

function termToNodeRecur(term: Term, path: string[]): RecordTree {
  switch (term.type) {
    case "Var":
      return { type: "Leaf", id: path.join("/"), content: term.name };
    case "StringLit":
      return {
        type: "Leaf",
        id: path.join("/"),
        content: JSON.stringify(term.val),
      };
    case "Record":
      return {
        type: "Node",
        children: [
          {
            type: "Leaf",
            id: [...path, "relation"].join("/"),
            content: term.relation,
          },
          {
            type: "Node",
            children: Object.keys(term.attrs).map((attr) => ({
              type: "Node",
              children: [
                {
                  type: "Leaf",
                  id: [...path, "attrs", attr].join("/"),
                  content: attr,
                },
                termToRecordTree(term.attrs[attr]),
              ],
            })),
          },
        ],
      };
  }
}
