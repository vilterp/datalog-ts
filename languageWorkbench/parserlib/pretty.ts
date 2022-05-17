import { SingleCharRule, Rule, Span } from "./grammar";
import { RuleTree } from "./ruleTree";
import { Tree } from "../../util/tree";
import { prettyPrintTree } from "../../core/pretty";

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
    case "Ref":
      return rule.rule;
    case "RepSep":
      return `repSep(${prettyPrintRule(rule.rep)}, ${prettyPrintRule(
        rule.sep
      )})`;
  }
}

export function ruleTreeToTree(tree: RuleTree, source: string): Tree<RuleTree> {
  return {
    key: renderRuleNode(tree, source),
    item: tree, // weird that the children are in here too, but oh well
    children: tree.children.map((c) => ruleTreeToTree(c, source)),
  };
}

export function renderRuleNode(n: RuleTree, source: string): string {
  return `${n.name}${
    n.children.length === 0
      ? `: ${JSON.stringify(source.substring(n.span.from, n.span.to))}`
      : ""
  } ${spanToString(n.span)}`;
}

function spanToString(span: Span): string {
  return `[${span.from}-${span.to}]`;
}

export function prettyPrintRuleTree(rt: RuleTree, source: string): string {
  return prettyPrintTree(ruleTreeToTree(rt, source), (n) =>
    renderRuleNode(n.item, source)
  );
}
