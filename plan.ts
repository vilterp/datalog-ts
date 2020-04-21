import { AndExpr, DB, PlanSpec, Rec } from "./types";
import { unify } from "./unify";

export function planQuery(db: DB, rec: Rec): PlanSpec {
  const relation = db[rec.relation];
  if (Array.isArray(relation)) {
    return scanAndFilterForRec(db, rec);
  }
  const andNodes = relation.defn.opts.map((andExpr) =>
    foldAnds(db, andExpr, relation.head)
  );
  return { type: "Or", opts: andNodes };
}

function foldAnds(db: DB, ae: AndExpr, template: Rec): PlanSpec {
  return ae.clauses.reduce<PlanSpec>(
    (accum, next) => ({
      type: "And",
      left: scanAndFilterForRec(db, next),
      right: accum,
      template,
    }),
    { type: "EmptyOnce" }
  );
}

function scanAndFilterForRec(db: DB, rec: Rec): PlanSpec {
  const relation = db[rec.relation];
  if (!Array.isArray(relation)) {
    throw new Error(`don't support planning with rules yet: ${rec.relation}`);
  }
  return {
    type: "Filter",
    inner: { type: "Scan", relation: rec.relation },
    record: rec,
  };
}
