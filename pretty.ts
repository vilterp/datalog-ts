import {
  Bindings,
  DB,
  Res,
  Rule,
  Term,
  VarMappings,
  TermWithBindings,
  ScopePath,
  InvocationLocation,
  SituatedBinding,
  BinExpr,
} from "./types";
import * as pp from "prettier-printer";
import { flatMap, flatMapObjToList, mapObjToList, repeat } from "./util/util";
import { pathToScopePath, makeTermWithBindings } from "./traceTree";
import { Tree } from "./tree";

export function prettyPrintTerm(term: Term): string {
  switch (term.type) {
    case "Var":
      return term.name;
    case "Record":
      return `${term.relation}{${mapObjToList(
        term.attrs,
        (k, v) => `${k}: ${prettyPrintTerm(v)}`
      ).join(", ")}}`;
    case "Array":
      return `[${term.items.map(prettyPrintTerm).join(", ")}]`;
    case "StringLit":
      return `"${escapeString(term.val)}"`;
    case "BinExpr":
      return prettyPrintBinExpr(term);
    case "Bool":
      return `${term.val}`;
    case "IntLit":
      return `${term.val}`;
  }
}

export function prettyPrintBinExpr(term: BinExpr): string {
  return `${prettyPrintTerm(term.left)} ${term.op} ${prettyPrintTerm(
    term.right
  )}`;
}

export function ppBE(term: BinExpr): string {
  return pp.render(100, prettyPrintBinExpr(term));
}

export function ppRule(rule: Rule): string {
  return pp.render(100, prettyPrintRule(rule));
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
  return prettyPrintTerm(t);
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

type RenderNodeFn<T> = (props: { item: T; key: string; path: T[] }) => string;

export function prettyPrintTree<T>(
  tree: Tree<T>,
  render: RenderNodeFn<T>
): string {
  return pptRecurse(0, tree, [tree.item], render).join("\n");
}

function pptRecurse<T>(
  depth: number,
  tree: Tree<T>,
  path: T[],
  render: RenderNodeFn<T>
): string[] {
  return [
    repeat(depth, "  ") + render({ item: tree.item, key: tree.key, path }),
    ...flatMap(tree.children, (child) =>
      pptRecurse(depth + 1, child, [...path, child.item], render)
    ),
  ];
}

// util

export function block(pair: [pp.IDoc, pp.IDoc], docs: pp.IDoc[]): pp.IDoc {
  return [pair[0], pp.intersperse(", ")(docs), pair[1]];
}

const re1 = /\\/g;
const re2 = /"/g;
const re3 = /\\n/g;

export function escapeString(str: string): string {
  return str.replace(re1, `\\\\`).replace(re2, `\\"`).replace(re3, `\\n`);
}
