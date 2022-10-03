export type MutationDefn = Expr;

type Expr =
  | { type: "Lambda"; args: string[]; body: Expr }
  | { type: "Do"; ops: Expr[] }
  | { type: "Read"; key: Expr }
  | { type: "Write"; key: Expr; val: Expr }
  | { type: "Let"; varName: string; val: Expr }
  | {
      type: "If";
      cond: Expr;
      ifTrue: Expr;
      ifFalse: Expr;
    };

export function lambda(args: string[], body: Expr): Expr {
  return { type: "Lambda", args, body };
}

export function ifExpr(cond: Expr, ifTrue: Expr, ifFalse: Expr): Expr {
  return { type: "If", cond, ifTrue, ifFalse };
}

export function letExpr(varName: string, val: Expr): Expr {
  return { type: "Let", varName, val };
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
