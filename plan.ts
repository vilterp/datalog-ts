import { AndExpr, DB, PlanNode, Rec } from "./types";

export function planQuery(db: DB, rec: Rec): PlanNode {
  const table = db.tables[rec.relation];
  if (table) {
    return scanAndFilterForRec(db, rec);
  }
  const rule = db.rules[rec.relation];
  if (!rule) {
    throw new Error(`not found: ${rec.relation}`); // TODO: start using result type
  }
  const andNodes = rule.defn.opts.map((andExpr) =>
    foldAnds(db, andExpr, rule.head)
  );
  return { type: "Or", opts: andNodes };
}

function foldAnds(db: DB, ae: AndExpr, template: Rec): PlanNode {
  return ae.clauses.reduce<PlanNode>(
    (accum, next) => ({
      type: "And",
      left: planQuery(db, next),
      right: accum,
      template,
    }),
    { type: "EmptyOnce" }
  );
}

function scanAndFilterForRec(db: DB, rec: Rec): PlanNode {
  return {
    type: "Filter",
    inner: { type: "Scan", relation: rec.relation },
    record: rec,
  };
}
