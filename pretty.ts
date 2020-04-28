import {
  Bindings,
  BinExpr,
  DB,
  PlanNode,
  Res,
  Rule,
  Term,
  VarMappings,
} from "./types";
import * as pp from "prettier-printer";
import { flatMapObjToList, mapObjToList } from "./util";

export function prettyPrintTerm(term: Term): pp.IDoc {
  switch (term.type) {
    case "Var":
      return term.name;
    case "Record":
      return [
        term.relation,
        block(
          pp.braces,
          mapObjToList(term.attrs, (k, v) => [k, ": ", prettyPrintTerm(v)])
        ),
      ];
    case "StringLit":
      return `"${term.val.split(`"`).join(`\\"`)}"`;
    case "BinExpr":
      return [
        prettyPrintTerm(term.left),
        ` ${term.op} `,
        prettyPrintTerm(term.right),
      ];
    case "Bool":
      return `${term.val}`;
  }
}

function prettyPrintMappings(mappings: VarMappings): pp.IDoc {
  return block(
    pp.braces,
    mapObjToList(mappings, (k, v) => [k, ": ", v])
  );
}

function prettyPrintBinExpr(expr: BinExpr): pp.IDoc {
  return [
    prettyPrintTerm(expr.left),
    ` ${expr.op} `,
    prettyPrintTerm(expr.right),
  ];
}

export function prettyPrintPlan(plan: PlanNode): pp.IDoc {
  switch (plan.type) {
    case "Join":
      return treeNode(
        ["And(", prettyPrintTerm(plan.template), ")"],
        [plan.left, plan.right]
      );
    case "Or":
      return treeNode("Or", plan.opts);
    case "Match":
      return treeNode(
        ["Match(", prettyPrintTerm(plan.record), ")"],
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
    case "Filter":
      return treeNode(
        ["BinExpr(", prettyPrintBinExpr(plan.expr), ")"],
        [plan.inner]
      );
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
  const oneLine = pp.intersperse(" | ")(
    rule.defn.opts.map((ae) =>
      pp.intersperse(" & ")(ae.clauses.map(prettyPrintTerm))
    )
  );
  const splitUp = [
    pp.line,
    pp.indent(
      2,
      pp.intersperse([" |", pp.line])(
        rule.defn.opts.map((ae) =>
          pp.intersperse([" &", pp.line])(ae.clauses.map(prettyPrintTerm))
        )
      )
    ),
  ];
  return [prettyPrintTerm(rule.head), " :- ", pp.choice(oneLine, splitUp)];
}

export function prettyPrintDB(db: DB): pp.IDoc {
  return pp.intersperse(pp.lineBreak)(
    [
      ...flatMapObjToList(db.tables, (name, tbl) => tbl.map(prettyPrintTerm)),
      ...mapObjToList(db.rules, (name, rule) => prettyPrintRule(rule)),
    ].map((d) => [d, "."])
  );
}

export function prettyPrintBindings(bindings: Bindings): pp.IDoc {
  return block(
    pp.braces,
    mapObjToList(bindings, (key, val) => [key, ": ", prettyPrintTerm(val)])
  );
}

export function prettyPrintRes(res: Res): pp.IDoc {
  return [prettyPrintTerm(res.term), "; ", prettyPrintBindings(res.bindings)];
}

export function prettyPrintResults(results: Res[]): pp.IDoc {
  return pp.intersperse(pp.line)(results.map(prettyPrintRes));
}

// util

export function block(pair: [pp.IDoc, pp.IDoc], docs: pp.IDoc[]): pp.IDoc {
  return [pair[0], pp.intersperse(", ")(docs), pair[1]];
}
