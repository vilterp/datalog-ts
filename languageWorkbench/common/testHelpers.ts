import { flattenByRule } from "../parserlib/flattenByRule";
import { parse } from "../parserlib/parser";
import { extractRuleTree } from "../parserlib/ruleTree";
import { LangImpl } from "./types";

export function getFlattened(impl: LangImpl, input: string) {
  const traceTree = parse(impl.grammar, "main", input);
  const ruleTree = extractRuleTree(traceTree);
  return flattenByRule(ruleTree, input, new Set<string>());
}
