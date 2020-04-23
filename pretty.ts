import { DB, PlanNode, Rule, Term, VarMappings } from "./types";
import * as pp from "prettier-printer";
import { flatMapObjToList, mapObjToList } from "./util";

export function prettyPrintTerm(term: Term): pp.IDoc {
  switch (term.type) {
    case "Var":
      return term.name;
    case "Record":
      return [
        term.relation,
        "{",
        pp.intersperse(", ")(
          mapObjToList(term.attrs, (k, v) => [k, ": ", prettyPrintTerm(v)])
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
    pp.intersperse(", ")(mapObjToList(mappings, (k, v) => [k, ": ", v])),
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

function prettyPrintRule(rule: Rule): pp.IDoc {
  return [
    prettyPrintTerm(rule.head),
    " :- ",
    pp.intersperse(" | ")(
      rule.defn.opts.map((ae) =>
        pp.intersperse(" & ")(ae.clauses.map(prettyPrintTerm))
      )
    ),
  ];
}

export function prettyPrintDB(db: DB): pp.IDoc {
  return pp.intersperse(pp.lineBreak)([
    ...flatMapObjToList(db.tables, (name, tbl) => tbl.map(prettyPrintTerm)),
    ...mapObjToList(db.rules, (name, rule) => prettyPrintRule(rule)),
  ]);
}
