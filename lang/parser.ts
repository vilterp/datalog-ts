import * as P from "parsimmon";

// adapted from https://github.com/jneen/parsimmon/blob/master/examples/json.js

export type Expr =
  | { type: "FuncCall"; name: Token; args: Expr[] }
  | { type: "Let"; name: Token; binding: Expr; body: Expr }
  | { type: "Var"; name: Token }
  | { type: "StringLit"; val: string; pos: Pos }
  | { type: "IntLit"; val: number; pos: Pos }
  | { type: "Lambda"; params: Param[]; body: Expr }
  | { type: "Placeholder"; val: Token };

type Param = { ty: Type; name: Token };

type Type = Token; // TODO: generics, etc

type Pos = { offset: number; line: number; column: number };

type Token = { ident: string; pos: Pos };

export const language = P.createLanguage({
  program: (r) => P.sepBy(r.statement, P.optWhitespace).trim(P.optWhitespace),

  expr: (r) =>
    P.alt(
      r.funcCall,
      r.lambda,
      r.letExpr,
      r.varExpr,
      r.stringLit,
      r.intLit,
      r.placeholder
    ),

  funcCall: (r) =>
    P.seq(
      r.identifier,
      r.lparen,
      P.sepBy(r.expr, r.comma),
      r.rparen
    ).map(([name, _, args, __]) => ({ type: "FuncCall", name, args })),
  lambda: (r) =>
    P.seq(
      r.lparen,
      P.sepBy(r.param, r.comma),
      r.rparen,
      r.rightArrow,
      r.expr
    ).map(([_, params, __, ___, body]) => ({
      type: "Lambda",
      params,
      body,
    })),
  param: (r) =>
    P.seq(r.identifier, r.colon, r.type).map(([name, _, ty]) => ({ ty, name })),
  letExpr: (r) =>
    P.seq(
      r.letWord,
      r.identifier,
      P.seq(P.optWhitespace, r.eq),
      r.expr,
      P.seq(P.optWhitespace, r.inWord),
      r.expr
    ).map(([_, name, __, binding, ___, body]) => ({
      type: "Let",
      name,
      binding,
      body,
    })),
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

  type: (r) => r.identifier, // TODO: generics, etc

  placeholder: () =>
    P.seq(P.index, word("???")).map(([pos, ident]) => ({
      type: "Placeholder",
      val: { ident, pos },
    })),

  eq: () => word("="),
  lparen: () => word("("),
  rparen: () => word(")"),
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
