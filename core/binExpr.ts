import { AndClause, Bindings, BinExpr, Rec, Term } from "./types";
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
    case "<":
      return termSameType(left, right) && termLT(left, right);
    case ">":
      return (
        termSameType(left, right) &&
        !termLT(left, right) &&
        !termEq(left, right)
      );
  }
}

export function extractBinExprs(clauses: AndClause[]): {
  recs: Rec[];
  exprs: BinExpr[];
} {
  const recs: Rec[] = [];
  const exprs: BinExpr[] = [];
  clauses.forEach((clause) => {
    switch (clause.type) {
      case "BinExpr":
        exprs.push(clause);
        break;
      case "Record":
        recs.push(clause);
        break;
    }
  });
  return {
    recs,
    exprs,
  };
}
