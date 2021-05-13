import { SingleCharRule, Rule, Span } from "./grammar";
import { RuleTree } from "./ruleTree";
import { Tree } from "../util/tree";
import { prettyPrintTree } from "../pretty";

// supposed to be like regex syntax
export function prettyPrintCharRule(rule: SingleCharRule): string {
  switch (rule.type) {
    case "Range":
      return `[${rule.from}-${rule.to}]`;
    case "Not":
      return `^${prettyPrintCharRule(rule.rule)}`;
    case "Literal":
      return rule.value;
    case "AnyChar":
      return ".";
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

export function ruleTreeToTree(tree: RuleTree): Tree<RuleTree> {
  return {
    key: renderRuleNode(tree),
    item: tree, // weird that the children are in here too, but oh well
    children: tree.children.map(ruleTreeToTree),
  };
}

export function renderRuleNode(n: RuleTree): string {
  return `${n.name} ${spanToString(n.span)}`;
}

function spanToString(span: Span): string {
  return `[${span.from}-${span.to}]`;
}

export function prettyPrintRuleTree(rt: RuleTree): string {
  return prettyPrintTree(ruleTreeToTree(rt), (n) => renderRuleNode(n.item));
}
