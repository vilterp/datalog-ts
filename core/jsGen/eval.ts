import { Expression, Statement } from "estree";
import { ppb } from "../pretty";
import { DB, rec, Rec, Rule, varr } from "../types";
import { substitute, unify, unifyVars } from "../unify";
import { generateRule, prettyPrintJS } from "./jsGen";

// TODO: should return Res[]
export function evaluateRule(db: DB, rule: Rule): Rec[] {
  const generated = generateCall(rule);
  // TODO: generate call
  const js = prettyPrintJS(generated);
  const context = {
    unify,
    unifyVars,
    substitute,
    db,
    // constructors
    rec,
    varr,
    // printers
    ppb,
  };
  const innerJS = `const ctx = this;\n${js}`;
  const func = Function(innerJS).bind(context);
  return func();
}

function generateCall(rule: Rule): Statement {
  const genRule = generateRule(rule);
  const call: Expression = {
    type: "CallExpression",
    callee: { type: "Identifier", name: rule.head.relation },
    arguments: [
      {
        type: "MemberExpression",
        object: { type: "ThisExpression" },
        property: { type: "Identifier", name: "db" },
        computed: false,
        optional: false,
      },
    ],
    optional: false,
  };
  return {
    type: "BlockStatement",
    body: [genRule, { type: "ReturnStatement", argument: call }],
  };
}
