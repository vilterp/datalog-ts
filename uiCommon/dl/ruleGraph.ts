import { Rule, Term } from "../../core/types";
import { Graph, recordLeaf, recordNode, RecordTree } from "../../util/graphviz";
import { flatMap } from "../../util/util";

export function ruleToGraph(rule: Rule): Graph {
  const varToPaths = combineVarToPaths(
    rule.body.opts.map((andExpr, optIdx) =>
      combineVarToPaths(
        andExpr.clauses.map((clause, clauseIdx) =>
          getVarToPaths(clause, [`opt${optIdx}`, `clause${clauseIdx}`])
        )
      )
    )
  );

  console.log(varToPaths);

  return {
    nodes: [
      {
        id: "head",
        attrs: {
          shape: "record",
          label: termToRecordTree(rule.head, ["head"], "down"),
        },
      },
      ...Object.keys(varToPaths).map((varName) => ({ id: varName, attrs: {} })),
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
    edges: [
      ...flatMap(Object.entries(varToPaths), ([varName, paths]) =>
        paths.map((path) => ({
          from: varName,
          to: path.join("/"),
          attrs: {},
        }))
      ),
    ],
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

// TODO: harmonize with core/ruleGraph

type AttrName = string;

type AttrPath = AttrName[];

type VarToPaths = { [varName: string]: AttrPath[] };

function getVarToPaths(term: Term, path: AttrPath): VarToPaths {
  switch (term.type) {
    case "Record":
      return combineVarToPaths(
        Object.entries(term.attrs).map(([key, val]) =>
          getVarToPaths(val, [...path, key])
        )
      );
    case "Var":
      return { [term.name]: [path] };
    case "BinExpr":
      return combineVarToPaths([
        getVarToPaths(term.left, [...path, "left"]),
        getVarToPaths(term.right, [...path, "right"]),
      ]);
    default:
      throw new Error(`TODO: ${term.type}`);
  }
}

function combineVarToPaths(inputs: VarToPaths[]): VarToPaths {
  const out: VarToPaths = {};
  inputs.forEach((input) => {
    Object.entries(input).forEach(([varName, path]) => {
      const current = out[varName] || [];
      out[varName] = [...current, ...path];
    });
  });
  return out;
}
