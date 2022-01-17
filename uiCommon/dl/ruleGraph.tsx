import { Rule, Term } from "../../core/types";
import { Graph, recordLeaf, recordNode, RecordTree } from "../../util/graphviz";
import { flatMap } from "../../util/util";

export function ruleToGraph(rule: Rule): Graph {
  return {
    nodes: [
      {
        id: "head",
        attrs: {
          shape: "record",
          label: termToRecordTree(rule.head, ["head"], "down"),
        },
      },
      ...flatMap(rule.body.opts, (andExpr, optIdx) =>
        andExpr.clauses.map((clause, clauseIdx) => {
          const path = [`opt${optIdx}`, `clause${clauseIdx}`];
          return {
            id: path.join("/"),
            attrs: {
              shape: "record",
              label: termToRecordTree(clause, path, "up"),
            },
          };
        })
      ),
    ],
    edges: [],
  };
}

type Orientation = "up" | "down";

function termToRecordTree(
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
              termToRecordTree(term.attrs[attr], [...path, attr], orientation),
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
          termToRecordTree(term.left, [...path, "left"], orientation),
          termToRecordTree(term.right, [...path, "right"], orientation),
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
