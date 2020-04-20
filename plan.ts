import { AndExpr, DB, PlanSpec, Rec } from "./types";
import { unify } from "./unify";

export function planQuery(db: DB, rec: Rec): PlanSpec {
  const relation = db[rec.relation];
  if (Array.isArray(relation)) {
    return { type: "Scan", relation: rec.relation };
  }
  const initialBindings = unify({}, rec, relation.head);
  const andNodes = relation.defn.opts.map((andExpr) => foldAnds(db, andExpr));
  return { type: "Or", opts: andNodes };
}

function foldAnds(db: DB, ae: AndExpr): PlanSpec {
  return ae.clauses.reduce<PlanSpec>(
    (accum, next) => ({
      type: "And",
      left: accum,
      right: scanAndFilterForRec(db, next),
    }),
    { type: "Success" }
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
