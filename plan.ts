import { AndExpr, DB, PlanSpec, Rec } from "./types";
import { unify } from "./unify";

export function planQuery(db: DB, rec: Rec): PlanSpec {
  const relation = db[rec.relation];
  if (Array.isArray(relation)) {
    return scanAndFilterForRec(db, rec);
  }
  const initialBindings = unify({}, rec, relation.head);
  const andNodes = relation.defn.opts.map((andExpr) => foldAnds(db, andExpr));
  return { type: "Or", opts: andNodes };
}

function foldAnds(db: DB, ae: AndExpr): PlanSpec {
  return ae.clauses.reduce<PlanSpec>(
    (accum, next) => ({
      type: "And",
      left: scanAndFilterForRec(db, next),
      right: accum,
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

function collapseAnds(spec: PlanSpec): PlanSpec {
  switch (spec.type) {
    case "And":
      if (spec.left.type === "EmptyOnce") {
        return spec.right;
      }
      if (spec.right.type === "EmptyOnce") {
        return spec.left;
      }
      return spec;
    case "Or":
      return { type: "Or", opts: spec.opts.map(collapseAnds) };
    case "Filter":
      return { ...spec, inner: collapseAnds(spec.inner) };
    default:
      return spec;
  }
}

export function optimize(spec: PlanSpec): PlanSpec {
  return collapseAnds(spec);
}
