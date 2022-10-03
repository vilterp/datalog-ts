import { Json } from "../../../../util/json";

export type MutationDefn = Expr;

export type Lambda = { type: "Lambda"; args: string[]; body: Expr };

export type Expr =
  | Lambda
  | { type: "Do"; ops: Expr[] }
  | { type: "Read"; key: Expr }
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
  | { type: "Apply"; name: string; args: Expr[] };

export function lambda(args: string[], body: Expr): Expr {
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

export function read(key: Expr): Expr {
  return { type: "Read", key };
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

export type Value = Json | Lambda;
