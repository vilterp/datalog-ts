"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.block = exports.prettyPrintResults = exports.prettyPrintRes = exports.prettyPrintBindings = exports.prettyPrintDB = exports.prettyPrintTerm = void 0;
var pp = require("prettier-printer");
var util_1 = require("./util");
function prettyPrintTerm(term) {
    switch (term.type) {
        case "Var":
            return term.name;
        case "Record":
            return [
                term.relation,
                block(pp.braces, util_1.mapObjToList(term.attrs, function (k, v) { return [k, ": ", prettyPrintTerm(v)]; })),
            ];
        case "Array":
            return ["[", pp.intersperse(",", term.items.map(prettyPrintTerm)), "]"];
        case "StringLit":
            return "\"" + term.val
                .split("\\")
                .join("\\\\")
                .split("\"")
                .join("\\\"")
                .split("\n")
                .join("\\n") + "\"";
        case "BinExpr":
            return [
                prettyPrintTerm(term.left),
                " " + term.op + " ",
                prettyPrintTerm(term.right),
            ];
        case "Bool":
            return "" + term.val;
        case "IntLit":
            return "" + term.val;
    }
}
exports.prettyPrintTerm = prettyPrintTerm;
function prettyPrintRule(rule) {
    var oneLine = pp.intersperse(" | ")(rule.defn.opts.map(function (ae) {
        return pp.intersperse(" & ")(ae.clauses.map(prettyPrintTerm));
    }));
    var splitUp = [
        pp.line,
        pp.indent(2, pp.intersperse([" |", pp.line])(rule.defn.opts.map(function (ae) {
            return pp.intersperse([" &", pp.line])(ae.clauses.map(prettyPrintTerm));
        }))),
    ];
    return [prettyPrintTerm(rule.head), " :- ", pp.choice(oneLine, splitUp)];
}
function prettyPrintDB(db) {
    return pp.intersperse(pp.lineBreak)(__spreadArrays(util_1.flatMapObjToList(db.tables, function (name, tbl) { return tbl.map(prettyPrintTerm); }), util_1.mapObjToList(db.rules, function (name, rule) { return prettyPrintRule(rule); })).map(function (d) { return [d, "."]; }));
}
exports.prettyPrintDB = prettyPrintDB;
function prettyPrintBindings(bindings) {
    return block(pp.braces, util_1.mapObjToList(bindings, function (key, val) { return [key, ": ", prettyPrintTerm(val)]; }));
}
exports.prettyPrintBindings = prettyPrintBindings;
function prettyPrintRes(res) {
    return [prettyPrintTerm(res.term), "; ", prettyPrintBindings(res.bindings)];
}
exports.prettyPrintRes = prettyPrintRes;
function prettyPrintResults(results) {
    return pp.intersperse(pp.line)(results.map(prettyPrintRes));
}
exports.prettyPrintResults = prettyPrintResults;
// util
function block(pair, docs) {
    return [pair[0], pp.intersperse(", ")(docs), pair[1]];
}
exports.block = block;
