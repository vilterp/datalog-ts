import { AndClause, BinExpr, Rec } from "./types";

export function extractBinExprs(
  clauses: AndClause[]
): { recs: Rec[]; exprs: BinExpr[] } {
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
