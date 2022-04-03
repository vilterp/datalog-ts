import {
  Conjunct,
  Bindings,
  BinExpr,
  DB,
  Res,
  Term,
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
import { filterMap, flatMap, objToPairs, repeat } from "../../util/util";
import { evalBinExpr } from "../binExpr";
import { ppb, ppt } from "../pretty";
import { fastPPB, fastPPT } from "../fastPPT";
import { perfMark, perfMeasure } from "../../util/perf";
import { IndexedCollection } from "../../util/indexedCollection";
import { LazyIndexedCollection } from "./lazyIndexedCollection";
import { List } from "immutable";

export function evaluate(db: DB, term: Term): Res[] {
  const cache: Cache = {};
  const res = evalTerm(0, [], term, db, cache, {});
  // console.log({ cache });
  return res;
}

function doJoin(
  depth: number,
  invokeLoc: InvocationLocation,
  db: DB,
  scope: Bindings,
  clauses: Conjunct[],
  cache: Cache
): Res[] {
  if (clauses.length === 0) {
    return [];
  }
  // console.log("doJoin", { clauses: clauses.map(ppt), scope: ppb(scope) });
  if (clauses.length === 1) {
    // console.log("doJoin: evaluating only clause", ppt(clauses[0]));
    return evalConjunct(
      depth + 1,
      [...invokeLoc, { type: "AndClause", idx: 0 }],
      db,
      scope,
      clauses[0],
      cache
    );
  }
  // console.group("doJoin: about to get left results");
  const leftResults = evalConjunct(
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
      cache
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
    return cacheRes;
  }
  const computeRes = evaluate();
  cache[cacheKey] = computeRes;
  return computeRes;
}

function evalConjunct(
  depth: number,
  path: RulePathSegment[],
  db: DB,
  scope: Bindings,
  term: Conjunct,
  cache: Cache
): Res[] {
  // console.group("doEvaluate", ppt(term), ppb(scope));
  // if (depth > 5) {
  //   throw new Error("too deep");
  // }
  const bigRes = ((): Res[] => {
    switch (term.type) {
      case "Record":
        return evalTerm(depth + 1, path, term, db, cache, scope);
      case "BinExpr":
        return evalBinExpr(term, scope).map((term) => ({
          term,
          bindings: {},
          trace: binExprTrace,
        }));
      case "Negation":
        throw new Error("TODO");
    }
  })();
  // console.groupEnd();
  // console.log(repeat(depth + 1, "="), "doevaluate <=", bigRes.map(ppr));
  return bigRes;
}

function evalTerm(
  depth: number,
  path: RulePathSegment[],
  term: Term,
  db: DB,
  cache: Cache,
  scope: Bindings
) {
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
    case "Bool":
    case "StringLit":
      return [{ term: term, bindings: scope, trace: literalTrace }];
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
