import { generate } from "astring";
import { FunctionDeclaration } from "estree";
import { flatMap } from "../../util/util";
import { Rule } from "../types";

export function generateJS(rule: Rule): FunctionDeclaration {
  const rulesUsed = flatMap(rule.body.opts, (andExpr) =>
    flatMap(andExpr.clauses, (clause) =>
      clause.type == "Record" ? [clause.relation] : []
    )
  );

  return {
    type: "FunctionDeclaration",
    id: {
      type: "Identifier",
      name: rule.head.relation,
    },
    params: rulesUsed.map((name) => ({ type: "Identifier", name })),
    body: {
      type: "BlockStatement",
      body: [],
    },
  };
}

export function prettyPrintJS(decl: FunctionDeclaration): string {
  return generate(decl);
}
