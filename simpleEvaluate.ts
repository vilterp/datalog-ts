import {
  AndClause,
  AndExpr,
  Bindings,
  BinExpr,
  DB,
  falseTerm,
  Rec,
  Res,
  Term,
  trueTerm,
  VarMappings,
  literalTrace,
  varTrace,
  binExprTrace,
  baseFactTrace,
  RulePathSegment,
  RulePath,
} from "./types";
import { substitute, termEq, unify, unifyVars } from "./unify";
import { filterMap, flatMap } from "./util";

export function evaluate(db: DB, term: Term): Res[] {
  return doEvaluate(0, [], db, {}, term);
}

function doJoin(
  depth: number,
  rulePath: RulePathSegment[],
  db: DB,
  scope: Bindings,
  clauses: AndClause[]
): Res[] {
  // console.log("doJoin", { clauses: clauses.map(ppt), scope: ppb(scope) });
  if (clauses.length === 1) {
    // console.log("doJoin: evaluating only clause", ppt(clauses[0]));
    return doEvaluate(
      depth + 1,
      [...rulePath, { type: "AndClause", idx: 0 }],
      db,
      scope,
      clauses[0]
    );
  }
  // console.group("doJoin: about to get left results");
  const leftResults = doEvaluate(
    depth + 1,
    [...rulePath, { type: "AndClause", idx: 0 }],
    db,
    scope,
    clauses[0]
  );
  // console.groupEnd();
  // console.log("doJoin: left results", leftResults.map(ppr));
  const out: Res[] = [];
  for (const leftRes of leftResults) {
    const nextScope = unifyVars(scope, leftRes.bindings);
    // console.log("about to join with");
    // console.log({
    //   leftResBindings: ppb(leftRes.bindings),
    //   scope: ppb(scope),
    //   clauses: clauses.slice(1).map(ppt),
    //   nextScope: ppb(nextScope),
    //   nextScope: nextScope ? ppb(nextScope) : null,
    // });
    const rightResults = doJoin(
      depth,
      [...rulePath, { type: "AndClause", idx: 1 }],
      db,
      nextScope,
      clauses.slice(1)
    );
    // console.groupEnd();
    // console.log("right results", rightResults);
    for (const rightRes of rightResults) {
      const unifyRes = unifyVars(leftRes.bindings, rightRes.bindings);
      if (unifyRes === null) {
        continue;
      }
      out.push({
        term: leftRes.term, // ???
        bindings: unifyRes,
        trace: {
          type: "AndTrace",
          sources: [leftRes, rightRes],
        },
      });
    }
  }
  return out;
}

function applyFilter(binExpr: BinExpr, res: Res[]): Res[] {
  return res.filter((res) => evalBinExpr(binExpr, res.bindings));
}

function applyFilters(exprs: BinExpr[], recResults: Res[]): Res[] {
  if (exprs.length === 0) {
    return recResults;
  }
  return applyFilter(exprs[0], applyFilters(exprs.slice(1), recResults));
}

function doEvaluate(
  depth: number,
  path: RulePathSegment[],
  db: DB,
  scope: Bindings,
  term: Term
): Res[] {
  // console.group(repeat(depth + 1, "="), "doEvaluate", ppt(term), ppb(scope));
  // if (depth > 5) {
  //   throw new Error("too deep");
  // }
  const bigRes = (() => {
    switch (term.type) {
      case "Record": {
        const table = db.tables[term.relation];
        if (table) {
          const out: Res[] = [];
          for (const rec of table) {
            const unifyRes = unify(scope, term, rec);
            // console.log("scan", {
            //   scope: ppb(scope),
            //   term: ppt(term),
            //   rec: ppt(rec),
            //   unifyRes: unifyRes ? ppb(unifyRes) : null,
            // });
            if (unifyRes === null) {
              continue;
            }
            // TODO: filter based on scope, right here
            out.push({
              term: rec,
              bindings: unifyRes,
              trace: {
                type: "MatchTrace",
                match: term,
                fact: { term: rec, trace: baseFactTrace, bindings: {} },
              },
            });
          }
          return out;
        }
        const rule = db.rules[term.relation];
        if (rule) {
          // console.log(
          //   "calling",
          //   pp.render(100, [
          //     prettyPrintTerm(term),
          //     "=>",
          //     prettyPrintTerm(rule.head),
          //   ])
          // );
          const substTerm = substitute(term, scope);
          const newScope = unify({}, substTerm, rule.head);
          // console.group(
          //   "rule",
          //   ppt(rule.head),
          //   newScope ? ppb(newScope) : "null"
          // );
          // console.log("call: unifying", {
          //   scope: {},
          //   ruleHead: ppt(rule.head),
          //   call: ppt(substTerm),
          //   res: newScope,
          // });
          if (newScope === null) {
            // console.groupEnd();
            return []; // ?
          }
          // console.log("call", {
          //   call: ppt(term),
          //   head: ppt(rule.head),
          //   newScope: ppb(newScope),
          // });
          const mappings = getMappings(rule.head.attrs, term.attrs);
          const rawResults = flatMap(rule.defn.opts, (andExpr, optIdx) => {
            const { recs: clauses, exprs } = extractBinExprs(andExpr);
            const recResults = doJoin(
              depth,
              [...path, { type: "OrOpt", idx: optIdx }],
              db,
              newScope,
              clauses
            );
            return applyFilters(exprs, recResults);
          });
          // console.groupEnd();
          // console.log("rawResults", rawResults.map(ppr));
          return filterMap(rawResults, (res) => {
            const mappedBindings = applyMappings(mappings, res.bindings);
            const nextTerm = substitute(rule.head, res.bindings);
            const unif = unify(mappedBindings, term, nextTerm);
            // console.log("unify", {
            //   prior: ppb(mappedBindings),
            //   left: ppt(term),
            //   right: ppt(nextTerm),
            //   res: unif ? ppb(unif) : null,
            // });
            if (unif === null) {
              return null;
            }
            // console.log({
            //   mappings: mappings,
            //   resTerm: ppt(res.term),
            //   resBindings: ppb(res.bindings),
            //   mappedBindings: ppb(mappedBindings),
            //   nextTerm: ppt(nextTerm),
            //   term: ppt(term), // call
            //   unifRaw: unif,
            //   unif: unif ? ppb(unif) : null,
            // });
            const outerRes: Res = {
              bindings: unif,
              term: nextTerm,
              trace: {
                type: "RefTrace",
                refTerm: term,
                invokeLoc: { type: "Rule", path },
                innerRes: res,
                mappings,
              },
            };
            return outerRes;
          });
        }
        throw new Error(`not found: ${term.relation}`);
      }
      case "Var":
        return [{ term: scope[term.name], bindings: scope, trace: varTrace }];
      case "BinExpr":
        return [
          {
            term: evalBinExpr(term, scope) ? trueTerm : falseTerm,
            bindings: scope,
            trace: binExprTrace,
          },
        ];
      case "Bool":
      case "StringLit":
        return [{ term: term, bindings: scope, trace: literalTrace }];
    }
  })();
  // console.groupEnd();
  // console.log(repeat(depth + 1, "="), "doevaluate <=", bigRes.map(ppr));
  return bigRes;
}

function evalBinExpr(expr: BinExpr, scope: Bindings): boolean {
  const left = substitute(expr.left, scope);
  const right = substitute(expr.right, scope);
  switch (expr.op) {
    case "=":
      return termEq(left, right);
    case "!=":
      return !termEq(left, right);
  }
}

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

function applyMappings(
  headToCaller: VarMappings,
  bindings: Bindings
): Bindings {
  const out: Bindings = {};
  for (const key of Object.keys(bindings)) {
    const callerKey = headToCaller[key];
    if (!callerKey) {
      continue;
    }
    out[callerKey] = bindings[key];
  }
  return out;
}

function extractBinExprs(term: AndExpr): { recs: Rec[]; exprs: BinExpr[] } {
  const recs: Rec[] = [];
  const exprs: BinExpr[] = [];
  term.clauses.forEach((clause) => {
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

export function hasVars(t: Term): boolean {
  switch (t.type) {
    case "StringLit":
      return false;
    case "Var":
      return true;
    case "Record":
      return Object.keys(t.attrs).some((k) => hasVars(t.attrs[k]));
    case "BinExpr":
      return hasVars(t.left) || hasVars(t.right);
    case "Bool":
      return false;
  }
}

export function pathToRulePath(path: Res[]): RulePath {
  return filterMap(path, (res) =>
    res.trace.type === "RefTrace"
      ? { name: res.trace.refTerm.relation, invokeLoc: res.trace.invokeLoc }
      : null
  );
}
