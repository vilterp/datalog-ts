import * as P from "parsimmon";

// adapted from https://github.com/jneen/parsimmon/blob/master/examples/json.js

export type Expr =
  | { type: "FuncCall"; func: Expr; arg: Expr }
  | { type: "Let"; name: Token; binding: Expr; body: Expr }
  | { type: "Var"; name: Token }
  | { type: "StringLit"; val: string; pos: Pos }
  | { type: "IntLit"; val: number; pos: Pos }
  | { type: "Lambda"; params: Param[]; retType: Type; body: Expr }
  | { type: "Placeholder"; val: Token };

type Param = { ty: Type; name: Token };

type Type = Token; // TODO: generics, etc

type Pos = { offset: number; line: number; column: number };

type Token = { ident: string; pos: Pos };

export const language = P.createLanguage({
  expr: (r) =>
    P.alt(
      r.funcCall,
      r.lambda,
      r.letExpr,
      r.varExpr,
      r.stringLit,
      r.intLit,
      r.placeholder
    ).skip(P.optWhitespace),

  funcCall: (r) =>
    P.seq(r.expr, r.lparen, r.expr, r.rparen).map(([func, _, arg, __]) => ({
      type: "FuncCall",
      func,
      arg,
    })),
  lambda: (r) =>
    P.seq(
      r.lparen,
      P.sepBy(r.param, r.comma),
      r.rparen,
      r.colon,
      r.type.skip(P.optWhitespace),
      r.rightArrow,
      r.expr
    ).map(([_1, params, _2, _3, retType, _4, body]) => ({
      type: "Lambda",
      params,
      body,
      retType,
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
    ).map(([_1, name, _2, binding, _3, body]) => ({
      type: "Let",
      name,
      binding,
      body,
    })),
  varExpr: (r) => r.identifier.map((id) => ({ type: "Var", name: id })),
  intLit: () =>
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
