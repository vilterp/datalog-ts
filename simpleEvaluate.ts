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
import { flatMap, mapObj, mapObjMaybe } from "./util";
import * as pp from "prettier-printer";
import { prettyPrintBindings, prettyPrintRes, prettyPrintTerm } from "./pretty";
import * as util from "util";

export function evaluate(db: DB, term: Term): Res[] {
  return doEvaluate(db, {}, term);
}

function doJoin(db: DB, scope: Bindings, clauses: AndClause[]): Res[] {
  if (clauses.length === 1) {
    return doEvaluate(db, scope, clauses[0]);
  }
  const leftResults = doEvaluate(db, scope, clauses[0]);
  if (leftResults.length === 0) {
    // short circuit
    return [];
  }
  const rightResults = doJoin(db, scope, clauses.slice(1));
  return singleJoin(db, scope, leftResults, rightResults);
}

function ppt(t: Term): pp.IDoc {
  return pp.render(100, prettyPrintTerm(t));
}

function ppb(b: Bindings): pp.IDoc {
  return pp.render(100, prettyPrintBindings(b));
}

function ppr(r: Res): pp.IDoc {
  return pp.render(100, prettyPrintRes(r));
}

function singleJoin(
  db: DB,
  scope: Bindings,
  leftResults: Res[],
  rightResults: Res[]
): Res[] {
  console.log(
    "singleJoin",
    util.inspect({ leftResults, rightResults }, { depth: null })
  );
  const out: Res[] = [];
  for (const left of leftResults) {
    for (const right of rightResults) {
      console.log("unifying", {
        leftBindings: left.bindings,
        rightBindings: right.bindings,
      });
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

function doEvaluate(db: DB, scope: Bindings, term: Term): Res[] {
  switch (term.type) {
    case "Record": {
      const table = db.tables[term.relation];
      if (table) {
        const out: Res[] = [];
        for (const rec of table) {
          const unifyRes = unify(scope, term, rec);
          console.log("scan", {
            scope: ppb(scope),
            term: ppt(term),
            rec: ppt(rec),
            unifyRes: unifyRes ? ppb(unifyRes) : null,
          });
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
        const newScope = unify(scope, rule.head, term);
        if (newScope === null) {
          return []; // ?
        }
        console.log({
          call: ppt(term),
          head: ppt(rule.head),
          newScope: ppb(newScope),
        });
        const mappings = getMappings(rule.head.attrs, term.attrs);
        const rawResults = flatMap(rule.defn.opts, (ae) => {
          const { recs, exprs } = extractBinExprs(ae);
          const recResults = doJoin(db, newScope, recs);
          return applyFilters(exprs, recResults);
        });
        return rawResults.map((res) => {
          const mappedBindings = applyMappings(mappings, res.bindings);
          return {
            bindings: mappedBindings,
            term: substitute(rule.head, res.bindings),
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
