import { SingleCharRule, Rule, Span } from "./grammar";
import { RuleTree } from "./ruleTree";
import { Tree } from "../tree";

// supposed to be like regex syntax
export function prettyPrintCharRule(rule: SingleCharRule): string {
  switch (rule.type) {
    case "Range":
      return `[${rule.from}-${rule.to}]`;
    case "Not":
      return `^${prettyPrintCharRule(rule.rule)}`;
    case "Literal":
      return rule.value;
  }
}

export function prettyPrintRule(rule: Rule): string {
  switch (rule.type) {
    case "Char":
      return prettyPrintCharRule(rule.rule);
    case "Choice":
      return `[${rule.choices.map(prettyPrintRule).join(" | ")}]`;
    case "Sequence":
      return rule.items.map(prettyPrintRule).join(", ");
    case "Text":
      return `"${rule.value.split(`"`).join(`\\"`)}"`;
    case "Succeed":
      return "Succeed";
    case "Ref":
      return rule.name;
    case "RepSep":
      return `RepSep(${prettyPrintRule(rule.rep)}, ${prettyPrintRule(
        rule.sep
      )})`;
  }
}

export function ruleTreeToTree(
  tree: RuleTree
): Tree<{ name: string; span: Span }> {
  return {
    key: tree.name,
    item: { name: tree.name, span: tree.span },
    children: tree.children.map(ruleTreeToTree),
  };
}
