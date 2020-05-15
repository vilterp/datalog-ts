"use strict";
exports.__esModule = true;
exports.hasVars = exports.ppr = exports.ppb = exports.ppt = exports.evaluate = void 0;
var types_1 = require("./types");
var unify_1 = require("./unify");
var util_1 = require("./util");
var pp = require("prettier-printer");
var pretty_1 = require("./pretty");
function evaluate(db, term) {
    return doEvaluate(0, db, {}, term);
}
exports.evaluate = evaluate;
function doJoin(depth, db, scope, clauses) {
    // console.log("doJoin", { clauses: clauses.map(ppt), scope: ppb(scope) });
    if (clauses.length === 1) {
        // console.log("doJoin: evaluating only clause", ppt(clauses[0]));
        return doEvaluate(depth + 1, db, scope, clauses[0]);
    }
    // console.group("doJoin: about to get left results");
    var leftResults = doEvaluate(depth + 1, db, scope, clauses[0]);
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
        var rightResults = doJoin(depth, db, nextScope, clauses.slice(1));
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
                bindings: unifyRes
            });
        }
    }
    return out;
}
function ppt(t) {
    return pp.render(100, pretty_1.prettyPrintTerm(t));
}
exports.ppt = ppt;
function ppb(b) {
    return pp.render(100, pretty_1.prettyPrintBindings(b));
}
exports.ppb = ppb;
function ppr(r) {
    return pp.render(100, pretty_1.prettyPrintRes(r));
}
exports.ppr = ppr;
function singleJoin(db, scope, leftResults, rightResults) {
    // console.log(
    //   "singleJoin",
    //   util.inspect({ leftResults, rightResults }, { depth: null })
    // );
    var out = [];
    for (var _i = 0, leftResults_2 = leftResults; _i < leftResults_2.length; _i++) {
        var left = leftResults_2[_i];
        for (var _a = 0, rightResults_2 = rightResults; _a < rightResults_2.length; _a++) {
            var right = rightResults_2[_a];
            // console.log("unifying", {
            //   leftBindings: left.bindings,
            //   rightBindings: right.bindings,
            // });
            var newBindings = unify_1.unifyVars(left.bindings, right.bindings);
            // console.log("unify", {
            //   left: ppt(left.term),
            //   right: ppt(right.term),
            //   bindings: newBindings ? ppb(newBindings) : "null",
            // });
            if (newBindings !== null) {
                out.push({
                    term: left.term,
                    bindings: newBindings
                });
            }
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
function doEvaluate(depth, db, scope, term) {
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
                        var rec_1 = table_1[_i];
                        var unifyRes = unify_1.unify(scope, term, rec_1);
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
                            term: rec_1,
                            bindings: unifyRes
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
                    // console.log("call: unifying", {
                    //   scope: {},
                    //   ruleHead: ppt(rule.head),
                    //   call: ppt(substTerm),
                    //   res: newScope,
                    // });
                    if (newScope_1 === null) {
                        return []; // ?
                    }
                    // console.log("call", {
                    //   call: ppt(term),
                    //   head: ppt(rule.head),
                    //   newScope: ppb(newScope),
                    // });
                    var mappings_1 = getMappings(rule_1.head.attrs, term.attrs);
                    var rawResults = util_1.flatMap(rule_1.defn.opts, function (ae) {
                        var _a = extractBinExprs(ae), recs = _a.recs, exprs = _a.exprs;
                        var recResults = doJoin(depth, db, newScope_1, recs);
                        return applyFilters(exprs, recResults);
                    });
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
                        return {
                            bindings: unif,
                            term: nextTerm
                        };
                    });
                }
                throw new Error("not found: " + term.relation);
            }
            case "Var":
                return [{ term: scope[term.name], bindings: scope }];
            case "BinExpr":
                return [
                    {
                        term: evalBinExpr(term, scope) ? types_1.trueTerm : types_1.falseTerm,
                        bindings: scope
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
function evalBinExpr(expr, scope) {
    var left = unify_1.substitute(expr.left, scope);
    var right = unify_1.substitute(expr.right, scope);
    switch (expr.op) {
        case "=":
            return unify_1.termEq(left, right);
        case "!=":
            return !unify_1.termEq(left, right);
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
