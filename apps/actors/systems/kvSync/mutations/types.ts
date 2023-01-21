import { Json } from "../../../../../util/json";

export type Lambda = { type: "Lambda"; args: string[]; body: Expr };

export type Expr =
  | Lambda
  | { type: "Do"; ops: Expr[] }
  | { type: "Read"; key: Expr; default: Json }
  | { type: "Write"; key: Expr; val: Expr }
  | { type: "Let"; bindings: { varName: string; val: Expr }[]; body: Expr }
  | {
      type: "If";
      cond: Expr;
      ifTrue: Expr;
      ifFalse: Expr;
    }
  | { type: "Abort"; reason: Expr }
  | { type: "Var"; name: string }
  | { type: "StringLit"; val: string }
  | { type: "IntLit"; val: number }
  | { type: "Apply"; name: string; args: Expr[] }
  | { type: "ObjectLit"; object: { [key: string]: Expr } };

export function lambda(args: string[], body: Expr): Lambda {
  return { type: "Lambda", args, body };
}

export function ifExpr(cond: Expr, ifTrue: Expr, ifFalse: Expr): Expr {
  return { type: "If", cond, ifTrue, ifFalse };
}

export function letExpr(
  bindings: { varName: string; val: Expr }[],
  body: Expr
): Expr {
  return { type: "Let", bindings, body };
}

export function read(key: Expr, defaultt: Json): Expr {
  return { type: "Read", key, default: defaultt };
}

export function write(key: Expr, val: Expr): Expr {
  return { type: "Write", key, val };
}

export function doExpr(ops: Expr[]): Expr {
  return { type: "Do", ops };
}

export function varr(name: string): Expr {
  return { type: "Var", name };
}

export function apply(name: string, args: Expr[]): Expr {
  return { type: "Apply", name, args };
}

export function abort(reason: Expr): Expr {
  return { type: "Abort", reason };
}

export function str(val: string): Expr {
  return { type: "StringLit", val };
}

export function int(val: number): Expr {
  return { type: "IntLit", val };
}

export function obj(object: { [key: string]: Expr }): Expr {
  return { type: "ObjectLit", object };
}

export type Value = Json | Lambda;

export type Scope = { [name: string]: Json };

export type Outcome = "Commit" | "Abort";
