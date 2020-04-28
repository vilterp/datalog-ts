import {
  Bindings,
  BinExpr,
  DB,
  Plan,
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

export function prettyPrintPlan(plan: Plan): pp.IDoc {
  return [
    `MAIN: ${plan.main}`,
    pp.lineBreak,
    pp.intersperse(pp.lineBreak)(
      mapObjToList(plan.rules, (key, val) => [
        `${key}:`,
        pp.lineBreak,
        pp.indent(2, prettyPrintPlanNode(val)),
      ])
    ),
  ];
}

export function prettyPrintPlanNode(node: PlanNode): pp.IDoc {
  switch (node.type) {
    case "Join":
      return treeNode(
        ["Join(", prettyPrintTerm(node.template), ")"],
        [node.left, node.right]
      );
    case "Or":
      return treeNode("Or", node.opts);
    case "Match":
      return treeNode(
        ["Match(", prettyPrintTerm(node.record), ")"],
        [node.inner]
      );
    case "Call":
      return [
        "Call(",
        prettyPrintTerm(node.ruleHead),
        ", ",
        prettyPrintMappings(node.mappings),
        ")",
      ];
    case "Scan":
      return ["Scan(", node.relation, ")"];
    case "Filter":
      return treeNode(
        ["BinExpr(", prettyPrintBinExpr(node.expr), ")"],
        [node.inner]
      );
    case "EmptyOnce":
      return "Empty";
  }
}

function treeNode(node: pp.IDoc, children: PlanNode[]): pp.IDoc {
  return [
    node,
    pp.lineBreak,
    pp.indent(
      2,
      pp.intersperse(pp.lineBreak)(children.map(prettyPrintPlanNode))
    ),
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
