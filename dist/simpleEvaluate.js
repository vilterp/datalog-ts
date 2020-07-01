"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.hasVars = exports.evaluate = void 0;
var types_1 = require("./types");
var unify_1 = require("./unify");
var util_1 = require("./util");
function evaluate(db, term) {
    return doEvaluate(0, [], db, {}, term);
}
exports.evaluate = evaluate;
function doJoin(depth, invokeLoc, db, scope, clauses) {
    // console.log("doJoin", { clauses: clauses.map(ppt), scope: ppb(scope) });
    if (clauses.length === 1) {
        // console.log("doJoin: evaluating only clause", ppt(clauses[0]));
        return doEvaluate(depth + 1, __spreadArrays(invokeLoc, [{ type: "AndClause", idx: 0 }]), db, scope, clauses[0]);
    }
    // console.group("doJoin: about to get left results");
    var leftResults = doEvaluate(depth + 1, __spreadArrays(invokeLoc, [{ type: "AndClause", idx: 0 }]), db, scope, clauses[0]);
    // console.groupEnd();
    // console.log("doJoin: left results", leftResults.map(ppr));
    var out = [];
    for (var _i = 0, leftResults_1 = leftResults; _i < leftResults_1.length; _i++) {
        var leftRes = leftResults_1[_i];
        var nextScope = unify_1.unifyVars(scope, leftRes.bindings);
        // console.log("about to join with");
        // console.log({
        //   leftResBindings: ppb(leftRes.bindings),
        //   scope: ppb(scope),
        //   clauses: clauses.slice(1).map(ppt),
        //   nextScope: ppb(nextScope),
        //   nextScope: nextScope ? ppb(nextScope) : null,
        // });
        var rightResults = doJoin(depth, __spreadArrays(invokeLoc, [{ type: "AndClause", idx: 1 }]), db, nextScope, clauses.slice(1));
        // console.groupEnd();
        // console.log("right results", rightResults);
        for (var _a = 0, rightResults_1 = rightResults; _a < rightResults_1.length; _a++) {
            var rightRes = rightResults_1[_a];
            var unifyRes = unify_1.unifyVars(leftRes.bindings, rightRes.bindings);
            if (unifyRes === null) {
                continue;
            }
            out.push({
                term: leftRes.term,
                bindings: unifyRes,
                trace: {
                    type: "AndTrace",
                    sources: [leftRes, rightRes]
                }
            });
        }
    }
    return out;
}
function applyFilter(binExpr, res) {
    return res.filter(function (res) { return evalBinExpr(binExpr, res.bindings); });
}
function applyFilters(exprs, recResults) {
    if (exprs.length === 0) {
        return recResults;
    }
    return applyFilter(exprs[0], applyFilters(exprs.slice(1), recResults));
}
function doEvaluate(depth, path, db, scope, term) {
    // console.group(repeat(depth + 1, "="), "doEvaluate", ppt(term), ppb(scope));
    // if (depth > 5) {
    //   throw new Error("too deep");
    // }
    var bigRes = (function () {
        switch (term.type) {
            case "Record": {
                var table = db.tables[term.relation];
                if (table) {
                    var out = [];
                    for (var _i = 0, table_1 = table; _i < table_1.length; _i++) {
                        var rec = table_1[_i];
                        var unifyRes = unify_1.unify(scope, term, rec);
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
                                fact: { term: rec, trace: types_1.baseFactTrace, bindings: {} }
                            }
                        });
                    }
                    return out;
                }
                var rule_1 = db.rules[term.relation];
                if (rule_1) {
                    // console.log(
                    //   "calling",
                    //   pp.render(100, [
                    //     prettyPrintTerm(term),
                    //     "=>",
                    //     prettyPrintTerm(rule.head),
                    //   ])
                    // );
                    var substTerm = unify_1.substitute(term, scope);
                    var newScope_1 = unify_1.unify({}, substTerm, rule_1.head);
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
                    if (newScope_1 === null) {
                        // console.groupEnd();
                        return []; // ?
                    }
                    // console.log("call", {
                    //   call: ppt(term),
                    //   head: ppt(rule.head),
                    //   newScope: ppb(newScope),
                    // });
                    var mappings_1 = getMappings(rule_1.head.attrs, term.attrs);
                    var rawResults = util_1.flatMap(rule_1.defn.opts, function (andExpr, optIdx) {
                        var _a = extractBinExprs(andExpr), clauses = _a.recs, exprs = _a.exprs;
                        var recResults = doJoin(depth, [{ type: "OrOpt", idx: optIdx }], db, newScope_1, clauses);
                        return applyFilters(exprs, recResults);
                    });
                    // console.groupEnd();
                    // console.log("rawResults", rawResults.map(ppr));
                    return util_1.filterMap(rawResults, function (res) {
                        var mappedBindings = applyMappings(mappings_1, res.bindings);
                        var nextTerm = unify_1.substitute(rule_1.head, res.bindings);
                        var unif = unify_1.unify(mappedBindings, term, nextTerm);
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
                        var outerRes = {
                            bindings: unif,
                            term: nextTerm,
                            trace: {
                                type: "RefTrace",
                                refTerm: term,
                                invokeLoc: path,
                                innerRes: res,
                                mappings: mappings_1
                            }
                        };
                        return outerRes;
                    });
                }
                throw new Error("not found: " + term.relation);
            }
            case "Var":
                return [{ term: scope[term.name], bindings: scope, trace: types_1.varTrace }];
            case "BinExpr":
                return [
                    {
                        term: evalBinExpr(term, scope) ? types_1.trueTerm : types_1.falseTerm,
                        bindings: scope,
                        trace: types_1.binExprTrace
                    },
                ];
            case "Bool":
            case "StringLit":
                return [{ term: term, bindings: scope, trace: types_1.literalTrace }];
        }
    })();
    // console.groupEnd();
    // console.log(repeat(depth + 1, "="), "doevaluate <=", bigRes.map(ppr));
    return bigRes;
}
function evalBinExpr(expr, scope) {
    var left = unify_1.substitute(expr.left, scope);
    var right = unify_1.substitute(expr.right, scope);
    switch (expr.op) {
        case "==":
            return unify_1.termEq(left, right);
        case "!=":
            return !unify_1.termEq(left, right);
        case "<=":
            return (unify_1.termSameType(left, right) &&
                (unify_1.termLT(left, right) || unify_1.termEq(left, right)));
        case ">=":
            return unify_1.termSameType(left, right) && !unify_1.termLT(left, right);
    }
}
function getMappings(head, call) {
    var out = {};
    // TODO: detect parameter mismatch!
    for (var _i = 0, _a = Object.keys(call); _i < _a.length; _i++) {
        var callKey = _a[_i];
        var callTerm = call[callKey];
        var headTerm = head[callKey];
        if ((headTerm === null || headTerm === void 0 ? void 0 : headTerm.type) === "Var" && (callTerm === null || callTerm === void 0 ? void 0 : callTerm.type) === "Var") {
            out[headTerm.name] = callTerm.name;
        }
    }
    return out;
}
function applyMappings(headToCaller, bindings) {
    var out = {};
    for (var _i = 0, _a = Object.keys(bindings); _i < _a.length; _i++) {
        var key = _a[_i];
        var callerKey = headToCaller[key];
        if (!callerKey) {
            continue;
        }
        out[callerKey] = bindings[key];
    }
    return out;
}
function extractBinExprs(term) {
    var recs = [];
    var exprs = [];
    term.clauses.forEach(function (clause) {
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
        recs: recs,
        exprs: exprs
    };
}
function hasVars(t) {
    switch (t.type) {
        case "StringLit":
            return false;
        case "Var":
            return true;
        case "Record":
            return Object.keys(t.attrs).some(function (k) { return hasVars(t.attrs[k]); });
        case "BinExpr":
            return hasVars(t.left) || hasVars(t.right);
        case "Bool":
            return false;
    }
}
exports.hasVars = hasVars;
