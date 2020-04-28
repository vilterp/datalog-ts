import {
  AndClause,
  Bindings,
  DB,
  falseTerm,
  rec,
  Res,
  Term,
  trueTerm,
  VarMappings,
} from "./types";
import { substitute, termEq, unify, unifyVars } from "./unify";
import { flatMap, mapObj } from "./util";
import * as pp from "prettier-printer";
import { prettyPrintBindings, prettyPrintTerm } from "./pretty";
import * as util from "util";

export function evaluate(db: DB, term: Term): Res[] {
  return doEvaluate(db, {}, term);
}

function doJoin(db: DB, scope: Bindings, clauses: AndClause[]): Res[] {
  if (clauses.length === 1) {
    return doEvaluate(db, scope, clauses[0]);
  }
  const leftResults = doEvaluate(db, scope, clauses[0]);
  const rightResults = doJoin(db, scope, clauses.slice(1));
  return singleJoin(db, scope, leftResults, rightResults);
}

function ppt(t: Term): pp.IDoc {
  return pp.render(100, prettyPrintTerm(t));
}

function ppb(b: Bindings): pp.IDoc {
  return pp.render(100, prettyPrintBindings(b));
}

function singleJoin(
  db: DB,
  scope: Bindings,
  leftResults: Res[],
  rightResults: Res[]
): Res[] {
  const out: Res[] = [];
  for (const left of leftResults) {
    for (const right of rightResults) {
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

function doEvaluate(db: DB, scope: Bindings, term: Term): Res[] {
  switch (term.type) {
    case "Record": {
      const table = db.tables[term.relation];
      if (table) {
        const out: Res[] = [];
        for (const rec of table) {
          const unifyRes = unify(scope, term, rec);
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
        const mappings = getMappings(rule.head.attrs, term.attrs);
        const newScope = mapObj(rule.head, (k) => scope[k]);
        const rawResults = flatMap(rule.defn.opts, (t) =>
          doJoin(db, newScope, t.clauses)
        );
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
    case "BinExpr": {
      const lefts = doEvaluate(db, scope, term.left);
      const rights = doEvaluate(db, scope, term.right);
      const out: Res[] = [];
      for (const left of lefts) {
        for (const right of rights) {
          let res: boolean;
          switch (term.op) {
            case "=":
              res = termEq(left.term, right.term);
              break;
            case "!=":
              res = !termEq(left.term, right.term);
              break;
          }
          out.push({ term: res ? trueTerm : falseTerm, bindings: scope });
        }
      }
      return out;
    }
    case "Bool":
    case "StringLit":
      return [{ term: term, bindings: scope }];
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
