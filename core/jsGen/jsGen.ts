import { generate } from "astring";
import { FunctionDeclaration, Node, Statement } from "estree";
import { flatMap } from "../../util/util";
import { AndClause, AndExpr, Rule } from "../types";

const OUT_VAR = "_out";

export function prettyPrintJS(decl: FunctionDeclaration): string {
  return generate(decl);
}

export function generateRule(rule: Rule): FunctionDeclaration {
  const rulesUsed = flatMap(rule.body.opts, (andExpr) =>
    flatMap(andExpr.clauses, (clause) =>
      clause.type == "Record" ? [clause.relation] : []
    )
  );

  const initOut: Node = {
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      left: { type: "Identifier", name: OUT_VAR },
      operator: "=",
      right: { type: "ArrayExpression", elements: [] },
    },
  };
  const returnOut: Node = {
    type: "ReturnStatement",
    argument: { type: "Identifier", name: OUT_VAR },
  };

  const joins = rule.body.opts.map((andExpr) => generateJoin(andExpr.clauses));

  return {
    type: "FunctionDeclaration",
    id: {
      type: "Identifier",
      name: rule.head.relation,
    },
    params: rulesUsed.map((name) => ({ type: "Identifier", name })),
    body: {
      type: "BlockStatement",
      body: [initOut, ...joins, returnOut],
    },
  };
}

function generateJoin(join: AndClause[]): Statement {
  if (join.length === 0) {
    return {
      type: "ExpressionStatement",
      expression: {
        type: "CallExpression",
        callee: {
          type: "MemberExpression",
          object: { type: "Identifier", name: OUT_VAR },
          property: { type: "Identifier", name: "push" },
          computed: false,
          optional: false,
        },
        arguments: [{ type: "Identifier", name: "foo" }], // TODO: what do we push?
        optional: false,
      },
    };
  }
  const clause = join[0];
  if (clause.type === "Record") {
    return {
      type: "ForOfStatement",
      body: generateJoin(join.slice(1)),
      await: false,
      left: { type: "Identifier", name: `${clause.relation}_item` },
      right: { type: "Identifier", name: clause.relation },
    };
  } else {
    // generate if statement
    throw new Error("TODO: generate if statement");
  }
}
