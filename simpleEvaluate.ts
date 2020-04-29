import {
  AndClause,
  AndExpr,
  Bindings,
  BinExpr,
  DB,
  falseTerm,
  Rec,
  rec,
  Res,
  Term,
  trueTerm,
  VarMappings,
} from "./types";
import { substitute, termEq, unify, unifyVars } from "./unify";
import { filterMap, flatMap, mapObj, mapObjMaybe, repeat } from "./util";
import * as pp from "prettier-printer";
import { prettyPrintBindings, prettyPrintRes, prettyPrintTerm } from "./pretty";
import * as util from "util";

export function evaluate(db: DB, term: Term): Res[] {
  return doEvaluate(0, db, {}, term);
}

function doJoin(
  depth: number,
  db: DB,
  scope: Bindings,
  clauses: AndClause[]
): Res[] {
  // console.log("doJoin", { clauses: clauses.map(ppt), scope: ppb(scope) });
  if (clauses.length === 1) {
    // console.log("doJoin: evaluating only clause", ppt(clauses[0]));
    return doEvaluate(depth + 1, db, scope, clauses[0]);
  }
  // console.group("doJoin: about to get left results");
  const leftResults = doEvaluate(depth + 1, db, scope, clauses[0]);
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
    const rightResults = doJoin(depth, db, nextScope, clauses.slice(1));
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
      });
    }
  }
  return out;
}

export function ppt(t: Term): pp.IDoc {
  return pp.render(100, prettyPrintTerm(t));
}

export function ppb(b: Bindings): pp.IDoc {
  return pp.render(100, prettyPrintBindings(b));
}

export function ppr(r: Res): pp.IDoc {
  return pp.render(100, prettyPrintRes(r));
}

function singleJoin(
  db: DB,
  scope: Bindings,
  leftResults: Res[],
  rightResults: Res[]
): Res[] {
  // console.log(
  //   "singleJoin",
  //   util.inspect({ leftResults, rightResults }, { depth: null })
  // );
  const out: Res[] = [];
  for (const left of leftResults) {
    for (const right of rightResults) {
      // console.log("unifying", {
      //   leftBindings: left.bindings,
      //   rightBindings: right.bindings,
      // });
      const newBindings = unifyVars(left.bindings, right.bindings);
      // console.log("unify", {
      //   left: ppt(left.term),
      //   right: ppt(right.term),
      //   bindings: newBindings ? ppb(newBindings) : "null",
      // });
      if (newBindings !== null) {
        out.push({
          term: left.term, // ???
          bindings: newBindings,
        });
      }
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

function doEvaluate(depth: number, db: DB, scope: Bindings, term: Term): Res[] {
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
          // console.log("call: unifying", {
          //   scope: {},
          //   ruleHead: ppt(rule.head),
          //   call: ppt(substTerm),
          //   res: newScope,
          // });
          if (newScope === null) {
            return []; // ?
          }
          // console.log("call", {
          //   call: ppt(term),
          //   head: ppt(rule.head),
          //   newScope: ppb(newScope),
          // });
          const mappings = getMappings(rule.head.attrs, term.attrs);
          const rawResults = flatMap(rule.defn.opts, (ae) => {
            const { recs, exprs } = extractBinExprs(ae);
            const recResults = doJoin(depth, db, newScope, recs);
            return applyFilters(exprs, recResults);
          });
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
            return {
              bindings: unif,
              term: nextTerm,
            };
          });
        }
        throw new Error(`not found: ${term.relation}`);
      }
      case "Var":
        return [{ term: scope[term.name], bindings: scope }];
      case "BinExpr":
        return [
          {
            term: evalBinExpr(term, scope) ? trueTerm : falseTerm,
            bindings: scope,
          },
        ];
      case "Bool":
      case "StringLit":
        return [{ term: term, bindings: scope }];
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
