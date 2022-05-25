import {
  Bindings,
  Res,
  Rule,
  Term,
  VarMappings,
  TermWithBindings,
  ScopePath,
  InvocationLocation,
  SituatedBinding,
} from "./types";
import * as pp from "prettier-printer";
import { mapObjToList, repeat, flatMap } from "../util/util";
import { prettyPrintTree, Tree } from "../util/tree";
import { DLStatement } from "../languageWorkbench/languages/dl/parser";
import { parserRuleToInternal, parserTermToInternal } from "./translateAST";
import { makeTermWithBindings, pathToScopePath } from "./termWithBindings";

export function prettyPrintStatement(stmt: DLStatement): pp.IDoc {
  switch (stmt.type) {
    case "Fact":
      return [prettyPrintTerm(parserTermToInternal(stmt.record)), "."];
    case "Rule":
      return [prettyPrintRule(parserRuleToInternal(stmt))];
    case "TableDecl":
      return [".table ", stmt.name.text];
    case "LoadStmt":
      return [".load ", stmt.path.text];
  }
}

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
    case "Bool":
      return `${term.val}`;
    case "IntLit":
      return `${term.val}`;
    case "Negation":
      return ["!", prettyPrintTerm(term.record)];
    case "Aggregation":
      return [
        term.aggregation,
        "[",
        term.varNames.join(", "),
        ":",
        prettyPrintTerm(term.record),
        "]",
      ];
  }
}

export function prettyPrintRule(rule: Rule): pp.IDoc {
  const oneLine = pp.intersperse(" | ")(
    rule.body.opts.map((ae) =>
      pp.intersperse(" & ")(ae.clauses.map(prettyPrintTerm))
    )
  );
  const splitUp = [
    pp.line,
    pp.indent(
      2,
      pp.intersperse([" |", pp.line])(
        rule.body.opts.map((ae) =>
          pp.intersperse([" &", pp.line])(ae.clauses.map(prettyPrintTerm))
        )
      )
    ),
  ];
  return [prettyPrintTerm(rule.head), " :- ", pp.choice(oneLine, splitUp)];
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

export function ppVM(
  vm: VarMappings,
  scopePath: ScopePath,
  opts: TracePrintOpts
): string {
  return pp.render(100, prettyPrintVarMappings(vm, scopePath, opts));
}

function prettyPrintVarMappings(
  vm: VarMappings,
  scopePath: ScopePath,
  opts: TracePrintOpts
): pp.IDoc {
  return [
    "{",
    pp.intersperse(
      ", ",
      mapObjToList(vm, (key, value) => [
        prettyPrintVar(key, scopePath, opts),
        ": ",
        prettyPrintVar(value, scopePath.slice(0, scopePath.length - 1), opts),
      ])
    ),
    "}",
  ];
}

// trace stuff

// TODO: this and prettyPrintVar are almost the same... lol
export function prettyPrintSituatedBinding(sb: SituatedBinding): pp.IDoc {
  return [sb.name, prettyPrintScopePath(sb.path)];
}

function prettyPrintVar(
  name: string,
  scopePath: ScopePath,
  opts: TracePrintOpts
): pp.IDoc {
  return [name, opts.showScopePath ? prettyPrintScopePath(scopePath) : ""];
}

export function prettyPrintTermWithBindings(
  term: TermWithBindings,
  scopePath: ScopePath,
  opts: TracePrintOpts
): pp.IDoc {
  switch (term.type) {
    case "RecordWithBindings":
      return [
        term.relation,
        block(
          pp.braces,
          mapObjToList(term.attrs, (k, v) => [
            k,
            ": ",
            v.binding ? [prettyPrintVar(v.binding, scopePath, opts), "@"] : "",
            prettyPrintTermWithBindings(v.term, scopePath, opts),
          ])
        ),
      ];
    case "ArrayWithBindings":
      return [
        "[",
        pp.intersperse(
          ",",
          term.items.map((t) => prettyPrintTermWithBindings(t, scopePath, opts))
        ),
        "]",
      ];
    case "BinExprWithBindings":
      return [
        prettyPrintTermWithBindings(term.left, scopePath, opts),
        ` ${term.op} `,
        prettyPrintTermWithBindings(term.right, scopePath, opts),
      ];
    case "Atom":
      return prettyPrintTerm(term.term);
  }
}

export type TracePrintOpts = { showScopePath: boolean };

export const defaultTracePrintOpts: TracePrintOpts = { showScopePath: false };

export function prettyPrintTrace(
  tree: Tree<Res>,
  opts: TracePrintOpts
): string {
  return prettyPrintTree(tree, ({ item: res, path }) =>
    pp.render(150, prettyPrintTraceNode(res, pathToScopePath(path), opts))
  );
}

function prettyPrintTraceNode(
  res: Res,
  path: ScopePath,
  opts: TracePrintOpts
): pp.IDoc {
  const termDoc = prettyPrintTermWithBindings(
    makeTermWithBindings(res.term, res.bindings),
    path,
    opts
  );
  switch (res.trace.type) {
    case "RefTrace":
      return [
        prettyPrintTermWithBindings(
          makeTermWithBindings(res.term, res.bindings),
          path.slice(0, path.length - 1),
          opts
        ),
        "; ",
        ppVM(res.trace.mappings, path, opts),
      ];
    case "MatchTrace":
      return termDoc;
    default:
      return termDoc;
  }
}

export function prettyPrintScopePath(path: ScopePath): pp.IDoc {
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

export function ppRule(rule: Rule): string {
  return pp.render(100, prettyPrintRule(rule));
}

export function pps(stmt: DLStatement): string {
  return pp.render(100, prettyPrintStatement(stmt));
}
