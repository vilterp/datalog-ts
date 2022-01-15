import { generate } from "astring";
import { FunctionDeclaration } from "estree";
import { Rule } from "../types";

export function generateJS(rule: Rule): FunctionDeclaration {
  return {
    type: "FunctionDeclaration",
    id: {
      type: "Identifier",
      name: rule.head.relation,
    },
    params: [],
    body: {
      type: "BlockStatement",
      body: [],
    },
  };
}

export function prettyPrintJS(decl: FunctionDeclaration): string {
  return generate(decl);
}
