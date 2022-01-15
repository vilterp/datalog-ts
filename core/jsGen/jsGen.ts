import { generate } from "astring";
import { FunctionDeclaration, Node } from "estree";
import { flatMap } from "../../util/util";
import { Rule } from "../types";

const OUT_VAR = "_out";

export function generateJS(rule: Rule): FunctionDeclaration {
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

  return {
    type: "FunctionDeclaration",
    id: {
      type: "Identifier",
      name: rule.head.relation,
    },
    params: rulesUsed.map((name) => ({ type: "Identifier", name })),
    body: {
      type: "BlockStatement",
      body: [initOut, returnOut],
    },
  };
}

export function prettyPrintJS(decl: FunctionDeclaration): string {
  return generate(decl);
}
