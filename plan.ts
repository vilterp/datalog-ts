import { AndExpr, DB, PlanNode, Rec, Rule, Term, VarMappings } from "./types";

export function planQuery(db: DB, term: Term): PlanNode {
  switch (term.type) {
    case "Record": {
      const table = db.tables[term.relation];
      if (table) {
        return scanAndFilterForRec(db, term);
      }
      const rule = db.rules[term.relation];
      if (!rule) {
        throw new Error(`not found: ${term.relation}`); // TODO: start using result type
      }
      return planRuleCall(db, rule, term);
    }
    case "BinExpr":
      return {
        type: "BinExpr",
        left: term.left,
        right: term.right,
        op: term.op,
      };
  }
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
  const project: PlanNode = {
    type: "Project",
    mappings,
    ruleHead: rule.head,
    inner, // inlining the inner rule here. could reference it instead.
  };
  // TODO: push down filters in optimizer instead of leaving up here
  return {
    type: "Match",
    inner: project,
    record: call,
  };
}

function foldAnds(db: DB, ae: AndExpr, template: Rec): PlanNode {
  return ae.clauses.reduce<PlanNode>(
    (accum, next) => ({
      type: "Join",
      left: planQuery(db, next),
      right: accum,
      template,
    }),
    { type: "EmptyOnce" }
  );
}

function scanAndFilterForRec(db: DB, rec: Rec): PlanNode {
  return {
    type: "Match",
    inner: { type: "Scan", relation: rec.relation },
    record: rec,
  };
}
