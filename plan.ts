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
  // TODO: detect parameter mismatch!
  for (const callKey of Object.keys(call)) {
    const callTerm = call[callKey];
    const headTerm = head[callKey];
    if (headTerm?.type === "Var" && callTerm?.type === "Var") {
      out[headTerm.name] = callTerm.name;
    }
  }
  return out;
}

function planRuleCall(db: DB, rule: Rule, call: Rec): PlanNode {
  const optionNodes = rule.defn.opts.map((andExpr) =>
    foldAnds(db, andExpr, rule.head)
  );
  const inner: PlanNode = { type: "Or", opts: optionNodes };
  const mappings = getMappings(rule.head.attrs, call.attrs);
  // console.log("mappings", {
  //   head: rule.head.attrs,
  //   call: call.attrs,
  //   res: mappings,
  // });
  return {
    type: "Project",
    mappings,
    ruleHead: rule.head,
    inner, // inlining the inner rule here. could reference it instead.
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
