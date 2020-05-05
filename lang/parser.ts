import * as P from "parsimmon";

// adapted from https://github.com/jneen/parsimmon/blob/master/examples/json.js

type Expr =
  | { type: "FuncCall"; name: Token; args: Expr[] }
  | { type: "Let"; name: Token; binding: Expr; body: Expr }
  | { type: "Var"; name: Token }
  | { type: "StringLit"; val: string; pos: Pos }
  | { type: "IntLit"; val: number; pos: Pos }
  | { type: "Lambda"; params: Param[] };

type Param = { expr: Expr; name: string };

type Pos = { offset: number; line: number; column: number };

type Token = { ident: string; pos: Pos };

export const language = P.createLanguage({
  program: (r) => P.sepBy(r.statement, P.optWhitespace).trim(P.optWhitespace),

  expr: (r) =>
    P.alt(r.funcCall, r.lambda, r.letExpr, r.varExpr, r.stringLit, r.intLit),

  funcCall: (r) =>
    P.seq(
      r.identifier,
      P.string("("),
      P.sepBy(r.expr, r.comma),
      P.string(")")
    ).map(([name, _, args, __]) => ({ type: "FuncCall", name, args })),
  lambda: (r) =>
    P.seq(
      P.string("("),
      P.sepBy(r.param, r.comma),
      P.string(")"),
      r.rightArrow,
      r.expr
    ),
  param: (r) => P.seq(r.identifier, r.colon, r.type),
  letExpr: (r) => P.seq(r.letWord, r.identifier, r.inWord, r.expr),
  varExpr: (r) => r.identifier.map((id) => ({ type: "Var", name: id })),
  intLit: (r) =>
    P.seq(P.index, P.regexp(/[0-9]+/)).map(([pos, v]) => ({
      type: "IntLit",
      val: Number.parseInt(v),
      pos,
    })),

  stringLit: (r) =>
    P.seq(
      P.index,
      P.regexp(/"((?:\\.|.)*?)"/, 1)
        .map(interpretEscapes)
        .desc("string")
    ).map(([pos, s]) => ({ type: "StringLit", val: s, pos })),

  identifier: () =>
    P.seq(
      P.index,
      P.regex(/([a-zA-Z_][a-zA-Z0-9_]*)/, 1).desc("identifier")
    ).map(([pos, ident]) => ({ ident, pos })),

  type: (r) => r.identifier,

  colon: () => word(":"),
  comma: () => word(","),
  letWord: () => word("let"),
  inWord: () => word("in"),
  rightArrow: () => word("=>"),
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
