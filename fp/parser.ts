import * as P from "parsimmon";

// adapted from https://github.com/jneen/parsimmon/blob/master/examples/json.js

export type Expr = (
  | { type: "FuncCall"; func: Expr; arg: Expr }
  | { type: "Let"; name: Token; binding: Expr; body: Expr }
  | { type: "Var"; name: string }
  | { type: "StringLit"; val: string }
  | { type: "IntLit"; val: number }
  | { type: "Lambda"; params: Param[]; retType: Type; body: Expr }
  | { type: "Placeholder"; val: string }
) &
  Located;

type Param = { ty: Type; name: Token };

type Type = Token; // TODO: generics, etc

export type Pos = { offset: number; line: number; column: number };

export type Span = { from: Pos; to: Pos };

type Located = { span: Span };

type Token = { ident: string; span: Span };

export const language = P.createLanguage({
  expr: (r) =>
    located(
      P.alt(
        r.funcCall,
        r.lambda,
        r.letExpr,
        r.varExpr,
        r.stringLit,
        r.intLit,
        r.placeholder.skip(P.optWhitespace)
      )
    ),

  funcCall: (r) =>
    P.seq(r.varExpr, r.lparen, P.sepBy(r.expr, r.comma), r.rparen).map(
      // TODO: don't curry directly in the parser
      ([func, _, args, __]) => curry(func, args)
    ),
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
  varExpr: (r) => r.identifier.map((id) => ({ ...id, type: "Var" })),
  intLit: () =>
    P.regexp(/[0-9]+/).map((v) => ({
      type: "IntLit",
      val: Number.parseInt(v),
    })),

  stringLit: (r) =>
    P.regexp(/"((?:\\.|.)*?)"/, 1)
      .map(interpretEscapes)
      .desc("string")
      .map((s) => ({ type: "StringLit", val: s })),

  // returns a token. TODO: rename to token?
  identifier: () =>
    P.seq(
      P.index,
      P.regex(/([a-zA-Z_][a-zA-Z0-9_]*)/, 1).desc("identifier"),
      P.index
    ).map(([from, ident, to]) => ({ ident, span: { from, to } })),

  type: (r) => r.identifier, // TODO: generics, etc

  placeholder: () =>
    P.string("???").map((ident) => ({
      type: "Placeholder",
      ident,
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

function located<T>(p: P.Parser<T>): P.Parser<T & Located> {
  return P.seq(P.index, p, P.index).map(([from, res, to]) => ({
    ...res,
    span: { from, to },
  }));
}

function curry(func: Expr, args: Expr[]): Expr {
  // TODO: not sure what span to assign here. But this is definitely wrong, lol.
  return args.reduce(
    (accum, arg) => ({ type: "FuncCall", func: accum, arg, span: func.span }),
    func
  );
}

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
