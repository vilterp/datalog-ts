import { Expression, Statement } from "estree";
import { DB, Rec, Rule } from "../types";
import { substitute, unify } from "../unify";
import { generateRule, prettyPrintJS } from "./jsGen";

// TODO: should return Res[]
export function evaluateRule(db: DB, rule: Rule): Rec[] {
  const generated = generateCall(rule);
  // TODO: generate call
  const js = prettyPrintJS(generated);
  const context = {
    unify,
    substitute,
    db,
  };
  const innerJS = `console.log(this);\n${js}`;
  console.log(innerJS);
  const func = Function(innerJS).bind(context);
  return func();
}

function generateCall(rule: Rule): Statement {
  const genRule = generateRule(rule);
  const call: Expression = {
    type: "CallExpression",
    callee: { type: "Identifier", name: rule.head.relation },
    arguments: [{ type: "Identifier", name: "db" }],
    optional: false,
  };
  return {
    type: "BlockStatement",
    body: [genRule, { type: "ReturnStatement", argument: call }],
  };
}
