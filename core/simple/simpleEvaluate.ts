import {
  AndClause,
  Bindings,
  BinExpr,
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
  relationalTrue,
  relationalFalse,
  rec,
} from "../types";
import {
  applyMappings,
  getMappings,
  substitute,
  unify,
  unifyBindings,
} from "../unify";
import { filterMap, flatMap, objToPairs, repeat } from "../../util/util";
import { evalBinExpr, extractBinExprs } from "../binExpr";
import { ppb, ppr, ppt } from "../pretty";
import { fastPPB, fastPPT } from "../fastPPT";
import { perfMark, perfMeasure } from "../../util/perf";
import { IndexedCollection } from "../../util/indexedCollection";
import { LazyIndexedCollection } from "./lazyIndexedCollection";
import { List } from "immutable";
import { BUILTINS } from "../builtins";
import { DB } from "./types";
import { AGGREGATIONS } from "../aggregations";

export function evaluate(db: DB, term: Term): Res[] {
  const cache: Cache = {};
  const res = doEvaluate(0, [], db, {}, term, cache);
  // console.log({ cache });
  return res;
}

function doJoin(
  depth: number,
  invokeLoc: InvocationLocation,
  db: DB,
  scope: Bindings,
  clauses: AndClause[],
  cache: Cache
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
      cache
    );
  }
  // console.group("doJoin: about to get left results");
  const leftResults = doEvaluate(
    depth + 1,
    [...invokeLoc, { type: "AndClause", idx: 0 }],
    db,
    scope,
    clauses[0],
    cache
  );
  // console.groupEnd();
  // console.log("doJoin: left results", leftResults.map(ppr));
  const out: Res[] = [];
  for (const leftRes of leftResults) {
    const nextScope = unifyBindings(scope, leftRes.bindings);
    // console.log({
    //   leftResBindings: ppb(leftRes.bindings),
    //   scope: ppb(scope),
    //   clauses: clauses.slice(1).map(ppt),
    //   nextScope: ppb(nextScope),
    // });
    const rightResults = doJoin(
      depth,
      [...invokeLoc, { type: "AndClause", idx: 1 }],
      db,
      nextScope,
      clauses.slice(1),
      cache
    );
    // console.groupEnd();
    // console.log("right results", rightResults);
    for (const rightRes of rightResults) {
      const unifyRes = unifyBindings(leftRes.bindings, rightRes.bindings);
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

function doEvaluate(
  depth: number,
  path: RulePathSegment[],
  db: DB,
  scope: Bindings,
  term: Term,
  cache: Cache
): Res[] {
  // console.group("doEvaluate", ppt(term), ppb(scope));
  // if (depth > 5) {
  //   throw new Error("too deep");
  // }
  const bigRes = ((): Res[] => {
    switch (term.type) {
      case "Record": {
        return memo(cache, term, scope, (): Res[] => {
          const table = db.tables.get(term.relation);
          // const virtual = db.virtualTables.get(term.relation);
          // const records = table ? table : virtual ? virtual(db) : null;
          if (table) {
            // console.log("scan", term.relation, ppb(scope));
            return getForScope(table, scope, term);
          }
          const builtin = BUILTINS[term.relation];
          if (builtin) {
            const substituted = substitute(term, scope) as Rec;
            const records = builtin(substituted);
            // console.log({ substituted: ppt(substituted), res: res.map(ppr) });
            const results = records.map(
              (rec): Res => ({
                term: rec,
                bindings: unify(scope, rec, term),
                trace: { type: "BaseFactTrace" }, // TODO: BuiltinTrace?
              })
            );
            // console.log(results.map(ppr));
            return results;
          }
          const rule = db.rules.get(term.relation);
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
              return doJoin(
                depth,
                [{ type: "OrOpt", idx: optIdx }],
                db,
                newScope,
                andExpr.clauses,
                cache
              );
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
            return finalRes;
          }
          throw new UserError(`not found: ${term.relation}`);
        });
      }
      case "Var":
        return [{ term: scope[term.name], bindings: scope, trace: varTrace }];
      case "BinExpr": {
        const res = evalBinExpr(term, scope);
        const relationalRes = res ? relationalTrue : relationalFalse;
        return relationalRes.map((term) => ({
          term,
          bindings: scope,
          trace: binExprTrace,
        }));
      }
      case "Bool":
      case "StringLit":
        return [{ term: term, bindings: scope, trace: literalTrace }];
      case "Negation":
        const results = doEvaluate(
          depth + 1,
          [...path, { type: "Negation" }],
          db,
          scope,
          term.record,
          cache
        );
        const terms = results.length > 0 ? relationalFalse : relationalTrue;
        return terms.map((resultTerm) => ({
          term: resultTerm,
          bindings: scope,
          trace: { type: "NegationTrace", negatedTerm: term.record },
        }));
      case "Aggregation": {
        const results = doEvaluate(
          depth + 1,
          [...path, { type: "Aggregation" }],
          db,
          scope,
          term.record,
          cache
        );
        const records = results.map((res) => res.term as Rec);
        const terms = records.map((record) => record.attrs[term.varName]);
        if (!AGGREGATIONS[term.aggregation]) {
          throw new UserError(`no such aggregation: ${term.aggregation}`);
        }
        const result = AGGREGATIONS[term.aggregation](terms);
        return [
          {
            // this seems weird, but idk
            term: rec(term.record.relation, {
              ...term.record.attrs,
              [term.varName]: result,
            }),
            bindings: scope,
            trace: { type: "AggregationTrace", aggregatedRecords: records },
          },
        ];
      }
    }
  })();
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

function getFromIndex(
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
      if (scopeVal.type === "Var" || scopeVal.type === "Record") {
        continue;
      }
      if (!collection.hasIndex(attr)) {
        continue;
      }
      // console.log("chose index from scope", {
      //   attr,
      //   index: collection.indexes[attr]
      //     .mapEntries(([k, v]) => [k, v.toArray().map(ppt)])
      //     .toObject(),
      //   val: ppt(scopeVal),
      //   res: collection.get(attr, scopeVal).map(ppt).toArray(),
      // });
      return collection.get(attr, scopeVal);
    }
    if (val.type === "Record") {
      continue;
    }
    if (!collection.hasIndex(attr)) {
      continue;
    }
    // console.log("chose index from attr", attr);
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
  const records = getFromIndex(collection, scope, original);
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

type Cache = { [key: string]: Res[] };

// only memoizing within the execution of one query...
function memo(
  cache: Cache,
  term: Rec,
  scope: Bindings,
  evaluate: () => Res[]
): Res[] {
  const cacheKey = `${fastPPT(term)} {${fastPPB(scope)}}`;
  const cacheRes = cache[cacheKey];
  if (cacheRes) {
    return cacheRes;
  }
  const computeRes = evaluate();
  cache[cacheKey] = computeRes;
  return computeRes;
}

// enable marking datalog rules on the Chrome devtools performance timeline
let perf = false;

if (typeof window !== "undefined") {
  // @ts-ignore
  window.dlPerf = {
    enable: () => {
      perf = true;
    },
    disable: () => {
      perf = false;
    },
  };
}
