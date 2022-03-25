import {
  AndClause,
  Bindings,
  BinExpr,
  DB,
  falseTerm,
  Res,
  Term,
  trueTerm,
  literalTrace,
  varTrace,
  binExprTrace,
  baseFactTrace,
  RulePathSegment,
  InvocationLocation,
  UserError,
  Rec,
} from "../types";
import {
  applyMappings,
  getMappings,
  substitute,
  unify,
  unifyVars,
} from "../unify";
import { filterMap, flatMap, repeat, uniqBy } from "../../util/util";
import { evalBinExpr, extractBinExprs } from "../binExpr";
import { ppb, ppt } from "../pretty";
import { perfMark, perfMeasure } from "../../util/perf";
import { LazyIndexedCollection } from "./lazyIndexedCollection";
import { List } from "immutable";
import { fastPPB, fastPPR, fastPPT } from "../fastPPT";

export function evaluate(db: DB, term: Term): Res[] {
  console.log("------------- ", ppt(term));
  const cache: Cache = {};
  const res = doEvaluate(0, [], db, {}, term, cache, [ppt(term)]);
  // console.log({ cache });
  return res;
}

function doJoin(
  depth: number,
  invokeLoc: InvocationLocation,
  db: DB,
  scope: Bindings,
  clauses: AndClause[],
  cache: Cache,
  stack: string[]
): Res[] {
  if (clauses.length === 0) {
    return [];
  }
  // console.log("doJoin", { clauses: clauses.map(ppt), scope: ppb(scope) });
  if (clauses.length === 1) {
    // console.log("doJoin: evaluating only clause", ppt(clauses[0]));
    return doEvaluate(
      depth + 1,
      [...invokeLoc, { type: "AndClause", idx: 0 }],
      db,
      scope,
      clauses[0],
      cache,
      [...stack, ppt(clauses[0])]
    );
  }
  // console.group("doJoin: about to get left results");
  const leftResults = doEvaluate(
    depth + 1,
    [...invokeLoc, { type: "AndClause", idx: 0 }],
    db,
    scope,
    clauses[0],
    cache,
    [...stack, ppt(clauses[0])]
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
      [...invokeLoc, { type: "AndClause", idx: 1 }],
      db,
      nextScope,
      clauses.slice(1),
      cache,
      stack
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

type Cache = { [key: string]: Res[] };

function memo(
  cache: Cache,
  term: Rec,
  scope: Bindings,
  evaluate: () => Res[]
): Res[] {
  const cacheKey = `${fastPPT(term)} {${fastPPB(scope)}}`;
  const cacheRes = cache[cacheKey];
  if (cacheRes) {
    if (perf) {
      performance.mark(`memoHit: ${cacheKey} => ${cacheRes.length}`);
    }
    return cacheRes;
  }
  const computeRes = evaluate();
  cache[cacheKey] = computeRes;
  return computeRes;
}

function doEvaluate(
  depth: number,
  path: RulePathSegment[],
  db: DB,
  scope: Bindings,
  term: Term,
  cache: Cache,
  stack: string[]
): Res[] {
  // console.group("doEvaluate", ppt(term), ppb(scope));
  // if (depth > 5) {
  //   throw new Error("too deep");
  // }
  const bigRes = (() => {
    switch (term.type) {
      case "Record": {
        return memo(cache, term, scope, () => {
          const table = db.tables[term.relation];
          // const virtual = db.virtualTables[term.relation];
          // const records = table ? table : virtual ? virtual(db) : null;
          if (table) {
            // console.log("scan", term.relation, ppb(scope));
            return getForScope(table, scope, term);
          }
          const rule = db.rules[term.relation];
          if (rule) {
            if (perf) {
              perfMark(`${term.relation} start`);
            }
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
            const rawResults = flatMap(rule.body.opts, (andExpr, optIdx) => {
              const { recs: clauses, exprs } = extractBinExprs(andExpr.clauses);
              const recResults = doJoin(
                depth,
                [{ type: "OrOpt", idx: optIdx }],
                db,
                newScope,
                clauses,
                cache,
                stack
              );
              return applyFilters(exprs, recResults);
            });
            // console.groupEnd();
            // console.log("rawResults", rawResults.map(ppr));
            const finalRes = filterMap(rawResults, (res) => {
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
                  invokeLoc: path,
                  innerRes: res,
                  mappings,
                },
              };
              return outerRes;
            });
            if (perf) {
              const e = `${term.relation} end`;
              perfMark(e);
              perfMeasure(
                `${term.relation}${fastPPB(scope)} => ${finalRes.length}`,
                `${term.relation} start`,
                e
              );
            }
            const finalFinalRes = uniqBy(finalRes, fastPPR);
            if (finalFinalRes.length < finalRes.length) {
              console.log({
                beforeLen: finalRes.length,
                afterLen: finalFinalRes.length,
              });
            }
            return finalFinalRes;
          }
          throw new UserError(`not found: ${term.relation}`);
        });
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
  if (bigRes.length > 1000) {
    console.warn("big relation:", {
      term: ppt(term),
      length: bigRes.length,
      stack,
    });
  }
  // console.groupEnd();
  // console.log(repeat(depth + 1, "="), "doevaluate <=", bigRes.map(ppr));
  return bigRes;
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

function getIndex(
  collection: LazyIndexedCollection,
  scope: Bindings,
  rec: Rec
): List<Rec> {
  if (!scope) {
    return null;
  }
  for (const attr in rec.attrs) {
    const val = rec.attrs[attr];
    if (!val) {
      continue;
    }
    if (val.type === "Var") {
      const scopeVal = scope[val.name];
      if (!scopeVal) {
        continue;
      }
      if (scopeVal.type === "Var") {
        continue;
      }
      if (!collection.hasIndex(attr)) {
        continue;
      }
      // console.log("chose index", {
      //   attr,
      //   index: collection.indexes[attr]
      //     .mapEntries(([k, v]) => [k, v.toArray().map(ppt)])
      //     .toObject(),
      //   val: ppt(val),
      //   res: collection.get(attr, scopeVal).map(ppt).toArray(),
      // });
      return collection.get(attr, scopeVal);
    }
    if (!collection.hasIndex(attr)) {
      continue;
    }
    // console.log("chose index", attr);
    return collection.get(attr, val);
  }
  return collection.all();
}

function getForScope(
  collection: LazyIndexedCollection,
  scope: Bindings,
  original: Rec
) {
  const out: Res[] = [];
  const records = getIndex(collection, scope, original);
  // console.log({
  //   original: ppt(original),
  //   scope: ppb(scope),
  //   res: records.toArray().map(ppt),
  // });
  for (const rec of records.toArray()) {
    const unifyRes = unify(scope, original, rec);
    // console.log("scan", {
    //   scope: ppb(scope),
    //   term: ppt(term),
    //   rec: ppt(rec),
    //   unifyRes: unifyRes ? ppb(unifyRes) : null,
    // });
    if (unifyRes === null) {
      continue;
    }
    out.push({
      term: rec,
      bindings: unifyRes,
      trace: {
        type: "MatchTrace",
        match: original,
        fact: { term: rec, trace: baseFactTrace, bindings: {} },
      },
    });
  }
  return out;
}

// enable marking datalog rules on the Chrome devtools performance timeline
let perf = false;

if (typeof window !== "undefined") {
  // @ts-ignore
  window.enablePerf = () => {
    perf = true;
  };

  // @ts-ignore
  window.disablePerf = () => {
    perf = false;
  };
}
