import {
  Bindings,
  BinExpr,
  relationalFalse,
  relationalTrue,
  Term,
} from "./types";
import { substitute, termEq, termLT, termSameType } from "./unify";

export function evalBinExpr(expr: BinExpr, scope: Bindings): Term[] {
  const left = substitute(expr.left, scope);
  const right = substitute(expr.right, scope);
  const res = (() => {
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
      case "<":
        return termSameType(left, right) && termLT(left, right);
      case ">":
        return (
          termSameType(left, right) &&
          !termLT(left, right) &&
          !termEq(left, right)
        );
    }
  })();
  return toRelationalBool(res);
}

function toRelationalBool(val: boolean) {
  return val ? relationalTrue : relationalFalse;
}
