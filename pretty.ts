import { Bindings, BinExpr, DB, Res, Rule, Term, VarMappings } from "./types";
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
    case "Array":
      return ["[", pp.intersperse(",", term.items.map(prettyPrintTerm)), "]"];
    case "StringLit":
      return `"${term.val
        .split("\\")
        .join("\\\\")
        .split(`"`)
        .join(`\\"`)
        .split("\n")
        .join("\\n")}"`;
    case "BinExpr":
      return [
        prettyPrintTerm(term.left),
        ` ${term.op} `,
        prettyPrintTerm(term.right),
      ];
    case "Bool":
      return `${term.val}`;
    case "IntLit":
      return `${term.val}`;
  }
}

export function prettyPrintRule(rule: Rule): pp.IDoc {
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
