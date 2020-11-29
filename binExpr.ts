import { Bindings, BinExpr } from "./types";
import { substitute, termEq, termLT, termSameType } from "./unify";

export function evalBinExpr(expr: BinExpr, scope: Bindings): boolean {
  const left = substitute(expr.left, scope);
  const right = substitute(expr.right, scope);
  switch (expr.op) {
    case "==":
      return termEq(left, right);
    case "!=":
      return !termEq(left, right);
    case "<=":
      return (
        termSameType(left, right) &&
        (termLT(left, right) || termEq(left, right))
      );
    case ">=":
      return termSameType(left, right) && !termLT(left, right);
  }
}
