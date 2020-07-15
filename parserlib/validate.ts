import { Grammar, Rule } from "./grammar";
import { flatten, flatMapObjToList } from "../util";

export function validateGrammar(g: Grammar): string[] {
  return flatMapObjToList(g, (ruleName, rule) =>
    validateRule(g, rule, ruleName)
  );
}

function validateRule(g: Grammar, r: Rule, scope: string): string[] {
  switch (r.type) {
    case "Choice":
      return flatten(r.choices.map((cr) => validateRule(g, cr, scope)));
    case "Sequence":
      return flatten(r.items.map((cr) => validateRule(g, cr, scope)));
    case "RepSep":
      return [
        ...validateRule(g, r.rep, scope),
        ...validateRule(g, r.sep, scope),
      ];
    case "Ref":
      const referenced = g[r.name];
      return referenced ? [] : [`no such rule: ${r.name} (in ${scope})`];
    default:
      return [];
  }
}
