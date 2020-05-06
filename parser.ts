import * as P from "parsimmon";
import { falseTerm, trueTerm } from "./types";

// adapted from https://github.com/jneen/parsimmon/blob/master/examples/json.js

export const language = P.createLanguage({
  program: (r) => P.sepBy(r.statement, P.optWhitespace).trim(P.optWhitespace),
  statement: (r) => P.alt(r.insert, r.rule),
  insert: (r) =>
    r.record.skip(r.period).map((rec) => ({ type: "Insert", record: rec })),
  rule: (r) =>
    P.seq(r.record, word(":-"), r.ruleOptions, r.period).map(
      ([head, _, options, __]) => ({
        type: "Rule",
        rule: { head, defn: options },
      })
    ),
  ruleOptions: (r) =>
    P.sepBy(r.andClauses, r.or).map((xs) => ({ type: "Or", opts: xs })),
  andClauses: (r) =>
    P.sepBy(r.clause, r.and).map((xs) => ({ type: "And", clauses: xs })),
  clause: (r) => P.alt(r.record, r.binExpr),
  term: (r) => P.alt(r.var, r.boolLit, r.record, r.stringLit, r.intLit), // TODO: binExpr should be in here...
  record: (r) =>
    P.seq(r.recordIdentifier, r.lbrace, r.pair.sepBy(r.comma), r.rbrace).map(
      ([ident, _, pairs, __]) => ({
        type: "Record",
        relation: ident,
        attrs: pairsToObj(pairs),
      })
    ),
  binExpr: (r) =>
    P.seq(
      r.var.skip(P.optWhitespace),
      r.binOp,
      r.var.skip(P.optWhitespace)
    ).map(([left, op, right]) => ({
      type: "BinExpr",
      left,
      right,
      op,
    })),
  stringLit: () =>
    P.regexp(/"((?:\\.|.)*?)"/, 1)
      .map(interpretEscapes)
      .desc("string")
      .map((s) => ({ type: "StringLit", val: s })),
  intLit: () =>
    P.digits.map((digits) => ({
      type: "IntLit",
      val: Number.parseInt(digits),
    })),
  boolLit: () =>
    P.alt(
      P.string("true").map(() => trueTerm),
      P.string("false").map(() => falseTerm)
    ),
  var: () =>
    P.regex(/([A-Z][a-zA-Z0-9_]*)/, 1).map((id) => ({ type: "Var", name: id })),
  pair: (r) => P.seq(r.recordIdentifier.skip(r.colon), r.term),

  recordIdentifier: () =>
    P.regex(/([a-z][a-zA-Z0-9_]*)/, 1).desc("recordIdentifier"),

  binOp: () => P.alt(word("="), word("!=")),
  lbrace: () => word("{"),
  rbrace: () => word("}"),
  colon: () => word(":"),
  comma: () => word(","),
  period: () => word("."),
  and: () => word("&"),
  or: () => word("|"),
});

function word(str) {
  return P.string(str).skip(P.optWhitespace);
}

// Turn escaped characters into real ones (e.g. "\\n" becomes "\n").
function interpretEscapes(str) {
  let escapes = {
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t",
  };
  return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, (_, escape) => {
    let type = escape.charAt(0);
    let hex = escape.slice(1);
    if (type === "u") {
      return String.fromCharCode(parseInt(hex, 16));
    }
    if (escapes.hasOwnProperty(type)) {
      return escapes[type];
    }
    return type;
  });
}

function pairsToObj<T>(pairs: [string, T][]): { [key: string]: T } {
  const out = {};
  pairs.forEach(([k, v]) => {
    out[k] = v;
  });
  return out;
}
