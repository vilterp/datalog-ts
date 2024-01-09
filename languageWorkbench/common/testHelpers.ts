import { flattenByRule } from "../parserlib/flattenByRule";
import { parse } from "../parserlib/parser";
import { extractRuleTree } from "../parserlib/ruleTree";
import { ParseErrors } from "../parserlib/types";
import { LangImpl } from "./types";

export function getFlattened(impl: LangImpl, input: string) {
  const traceTree = parse(impl.grammar, "main", input);
  const [ruleTree, errors] = extractRuleTree(traceTree);
  if (errors.length > 0) {
    throw new ParseErrors(errors);
  }
  return flattenByRule(ruleTree, input, new Set<string>());
}
