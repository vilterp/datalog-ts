import { Rule, Term } from "../../core/types";
import { Graph, recordLeaf, recordNode, RecordTree } from "../../util/graphviz";
import { flatMap } from "../../util/util";

export function ruleToGraph(rule: Rule): Graph {
  const bodyVarToPaths = combineVarToPaths(
    rule.body.opts.map((andExpr, optIdx) =>
      combineVarToPaths(
        andExpr.clauses.map((clause, clauseIdx) =>
          getVarToPaths(clause, [`opt${optIdx}`, `clause${clauseIdx}`])
        )
      )
    )
  );

  const headVarToPaths = getVarToPaths(rule.head, []);

  return {
    nodes: [
      {
        id: "head",
        attrs: {
          shape: "record",
          label: termToRecordTree(rule.head, ["head"], "down"),
        },
      },
      ...Object.keys(bodyVarToPaths).map((varName) => ({
        id: varName,
        attrs: {},
      })),
      ...flatMap(rule.body.opts, (andExpr, optIdx) =>
        andExpr.clauses.map((clause, clauseIdx) => {
          return {
            id: [`opt${optIdx}`, `clause${clauseIdx}`].join("/"),
            attrs: {
              shape: "record",
              label: termToRecordTree(clause, [], "up"),
            },
          };
        })
      ),
    ],
    edges: [
      ...flatMap(Object.entries(headVarToPaths), ([varName, paths]) =>
        paths.map((path) => {
          return {
            from: { nodeID: "head", rowID: path.join("/") },
            to: varName,
            attrs: {},
          };
        })
      ),
      ...flatMap(Object.entries(bodyVarToPaths), ([varName, paths]) =>
        paths.map((path) => {
          const nodeID = path.slice(0, 2).join("/");
          const rowID = path.slice(2).join("/");
          return {
            from: varName,
            to: { nodeID, rowID },
            attrs: {},
          };
        })
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
