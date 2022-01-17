import { Rule, Term } from "../../core/types";
import { Graph, recordLeaf, recordNode, RecordTree } from "../../util/graphviz";
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
      return recordLeaf(path.join("/"), term.name);
    case "StringLit":
      return recordLeaf(path.join("/"), JSON.stringify(term.val));
    case "Record":
      return recordNode([
        recordLeaf([...path, "relation"].join("/"), term.relation),
        recordNode(
          Object.keys(term.attrs).map((attr) =>
            recordNode([
              recordLeaf([...path, "attrs", attr].join("/"), attr),
              termToRecordTree(term.attrs[attr]),
            ])
          )
        ),
      ]);
  }
}
