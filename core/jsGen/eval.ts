import { DB, Rec, Rule } from "../types";
import { substitute, unify } from "../unify";
import { generateRule, prettyPrintJS } from "./jsGen";

// TODO: should return Res[]
export function evaluateRule(db: DB, rule: Rule): Rec[] {
  const generated = generateRule(rule);
  // TODO: generate call
  const js = prettyPrintJS(generated);
  const context = {
    unify,
    substitute,
  };
  const closure = () => eval(js);
  return closure.call(context);
}
