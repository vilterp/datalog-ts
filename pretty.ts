import { Bindings, DB, Res, Rule, Term, Trace } from "./types";
import * as pp from "prettier-printer";
import { flatMapObjToList, mapObjToList } from "./util";
import { Tree, prettyPrintTree, node, leaf } from "./treePrinter";

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

// traces

export function prettyPrintTrace(trace: Trace): string {
  return prettyPrintTree(traceToTree(trace));
}

export function traceToTree(trace: Trace): Tree {
  switch (trace.type) {
    case "AndTrace":
      return node(`And (${trace.ruleName})`, trace.sources.map(resToTraceTree));
    case "MatchTrace":
      return node(`Match (${ppt(trace.match)})`, [resToTraceTree(trace.fact)]);
    case "VarTrace":
      return leaf("var");
    case "BinExprTrace":
      return leaf("bin expr");
    case "BaseFactTrace":
      return leaf("base fact");
    case "LiteralTrace":
      return leaf("literal");
  }
}

function resToTraceTree(res: Res): Tree {
  return { body: ppr(res), children: [traceToTree(res.trace)] };
}

// util

export function block(pair: [pp.IDoc, pp.IDoc], docs: pp.IDoc[]): pp.IDoc {
  return [pair[0], pp.intersperse(", ")(docs), pair[1]];
}
