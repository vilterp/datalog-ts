import {
  Bindings,
  DB,
  Res,
  Rule,
  Term,
  VarMappings,
  TermWithBindings,
  RulePath,
  InvocationLocation,
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
    case "Array":
      return ["[", pp.intersperse(",", term.items.map(prettyPrintTerm)), "]"];
    case "StringLit":
      return `"${escapeString(term.val)}"`;
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

export function prettyPrintTermWithBindings(term: TermWithBindings): pp.IDoc {
  switch (term.type) {
    case "RecordWithBindings":
      return [
        term.relation,
        block(
          pp.braces,
          mapObjToList(term.attrs, (k, v) => [
            k,
            ": ",
            v.binding ? [v.binding, "@"] : "",
            prettyPrintTermWithBindings(v.term),
          ])
        ),
      ];
    case "ArrayWithBindings":
      return [
        "[",
        pp.intersperse(",", term.items.map(prettyPrintTermWithBindings)),
        "]",
      ];
    case "BinExprWithBindings":
      return [
        prettyPrintTermWithBindings(term.left),
        ` ${term.op} `,
        prettyPrintTermWithBindings(term.right),
      ];
    case "Atom":
      return prettyPrintTerm(term.term);
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

// compact convenience functions, straight to string

export function ppt(t: Term): string {
  return pp.render(100, prettyPrintTerm(t));
}

export function ppb(b: Bindings): string {
  return pp.render(100, prettyPrintBindings(b));
}

export function ppr(r: Res): string {
  return pp.render(100, prettyPrintRes(r));
}

export function ppVM(vm: VarMappings): string {
  return pp.render(100, prettyPrintVarMappings(vm));
}

function prettyPrintVarMappings(vm: VarMappings): pp.IDoc {
  return [
    "{",
    pp.intersperse(
      ", ",
      mapObjToList(vm, (key, value) => [key, ": ", value])
    ),
    "}",
  ];
}

// util

export function block(pair: [pp.IDoc, pp.IDoc], docs: pp.IDoc[]): pp.IDoc {
  return [pair[0], pp.intersperse(", ")(docs), pair[1]];
}

export function escapeString(str: string): string {
  return str
    .split("\\")
    .join("\\\\")
    .split(`"`)
    .join(`\\"`)
    .split("\n")
    .join("\\n");
}

export function prettyPrintRulePath(path: RulePath): pp.IDoc {
  return [
    "[",
    pp.intersperse(
      ", ",
      path.map((seg) => [seg.name, prettyPrintInvokeLoc(seg.invokeLoc)])
    ),
    "]",
  ];
}

export function prettyPrintInvokeLoc(il: InvocationLocation): pp.IDoc {
  return [
    "[",
    pp.intersperse(
      ", ",
      il.map((seg) => {
        switch (seg.type) {
          case "OrOpt":
            return `or(${seg.idx})`;
          case "AndClause":
            return `and(${seg.idx})`;
        }
      })
    ),
    "]",
  ];
}
