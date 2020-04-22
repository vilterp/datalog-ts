import { AndExpr, DB, PlanNode, Rec, Rule, Term, VarMappings } from "./types";

export function planQuery(db: DB, rec: Rec): PlanNode {
  const table = db.tables[rec.relation];
  if (table) {
    return scanAndFilterForRec(db, rec);
  }
  const rule = db.rules[rec.relation];
  if (!rule) {
    throw new Error(`not found: ${rec.relation}`); // TODO: start using result type
  }
  return planRuleCall(db, rule, rec);
}

// return mapping from head var to call var
function getMappings(
  head: { [p: string]: Term },
  call: { [p: string]: Term }
): VarMappings {
  const out: VarMappings = {};
  // TODO: detect parameter mismatch
  for (const callKey of Object.keys(call)) {
    const callTerm = call[callKey];
    const headTerm = head[callKey];
    console.log({ headTerm, callTerm });
    if (headTerm?.type === "Var" && callTerm?.type === "Var") {
      out[headTerm.name] = callTerm.name;
    }
  }
  return out;
}

function planRuleCall(db: DB, rule: Rule, template: Rec): PlanNode {
  const optionNodes = rule.defn.opts.map((andExpr) =>
    foldAnds(db, andExpr, rule.head)
  );
  return {
    type: "Project",
    mappings: getMappings(rule.head.attrs, template.attrs),
    inner: { type: "Or", opts: optionNodes },
    ruleName: template.relation,
  };
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
