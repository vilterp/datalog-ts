import { Rule, Term } from "../../core/types";
import { Graph, recordLeaf, recordNode, RecordTree } from "../../util/graphviz";
import { flatMap } from "../../util/util";

export function ruleToGraph(rule: Rule): Graph {
  return {
    nodes: [
      {
        id: "head",
        attrs: { shape: "record", label: termToRecordTree(rule.head, "down") },
      },
      ...flatMap(rule.body.opts, (andExpr) =>
        andExpr.clauses.map((clause) => termToRecordTree(clause, "up"))
      ).map((recTree, idx) => ({
        id: `${idx}`,
        attrs: { shape: "record", label: recTree },
      })),
    ],
    edges: [],
  };
}

type Orientation = "up" | "down";

function termToRecordTree(term: Term, orientation: Orientation): RecordTree {
  return termToRecordTreeRecur(term, [], orientation);
}

function termToRecordTreeRecur(
  term: Term,
  path: string[],
  orientation: Orientation
): RecordTree {
  switch (term.type) {
    case "Var":
      return recordLeaf(path.join("/"), term.name);
    case "StringLit":
      return recordLeaf(path.join("/"), JSON.stringify(term.val));
    case "Record": {
      const contents = [
        recordLeaf([...path, "relation"].join("/"), term.relation),
        recordNode(
          Object.keys(term.attrs).map((attr) => {
            const contents = [
              recordLeaf([...path, "attrs", attr].join("/"), attr),
              termToRecordTreeRecur(
                term.attrs[attr],
                [...path, attr],
                orientation
              ),
            ];
            return recordNode(
              orientation === "down" ? contents : contents.reverse()
            );
          })
        ),
      ];
      return recordNode([
        recordNode(orientation === "down" ? contents : contents.reverse()),
      ]);
    }
    case "BinExpr": {
      const contents = [
        recordLeaf([...path, "binOp"].join("/"), term.op),
        recordNode([
          termToRecordTreeRecur(term.left, [...path, "left"], orientation),
          termToRecordTreeRecur(term.right, [...path, "right"], orientation),
        ]),
      ];
      return recordNode([
        recordNode(orientation === "down" ? contents : contents.reverse()),
      ]);
    }
    default:
      throw new Error(`TODO: ${term.type}`);
  }
}
