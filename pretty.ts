import { PlanNode, Term, VarMappings } from "./types";
import * as pp from "prettier-printer";

export function prettyPrintTerm(term: Term): pp.IDoc {
  switch (term.type) {
    case "Var":
      return term.name;
    case "Record":
      return [
        term.relation,
        "{",
        pp.intersperse(", ")(
          Object.keys(term.attrs).map((k) => [
            k,
            ": ",
            prettyPrintTerm(term.attrs[k]),
          ])
        ),
        "}",
      ];
    case "StringLit":
      return `"${term.val.split(`"`).join(`\\"`)}"`;
  }
}

function prettyPrintMappings(mappings: VarMappings): pp.IDoc {
  return [
    "{",
    pp.intersperse(", ")(
      Object.keys(mappings)
        .sort()
        .map((k) => [k, ": ", mappings[k]])
    ),
    "}",
  ];
}

export function prettyPrintPlan(plan: PlanNode): pp.IDoc {
  switch (plan.type) {
    case "And":
      return treeNode(
        ["And(", prettyPrintTerm(plan.template), ")"],
        [plan.left, plan.right]
      );
    case "Or":
      return treeNode("Or", plan.opts);
    case "Filter":
      return treeNode(
        ["Filter(", prettyPrintTerm(plan.record), ")"],
        [plan.inner]
      );
    case "Project":
      return treeNode(
        [
          "Project(",
          prettyPrintTerm(plan.ruleHead),
          ", ",
          prettyPrintMappings(plan.mappings),
          ")",
        ], // TODO: other attributes
        [plan.inner]
      );
    case "Scan":
      return ["Scan(", plan.relation, ")"];
    case "EmptyOnce":
      return "Empty";
  }
}

function treeNode(node: pp.IDoc, children: PlanNode[]): pp.IDoc {
  return [
    node,
    pp.lineBreak,
    pp.indent(2, pp.intersperse(pp.lineBreak)(children.map(prettyPrintPlan))),
  ];
}
