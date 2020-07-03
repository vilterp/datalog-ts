"use strict";
exports.__esModule = true;
exports.falseTerm = exports.trueTerm = exports.array = exports.binExpr = exports.varr = exports.rec = exports.int = exports.str = exports.scopePathEq = exports.binExprTrace = exports.baseFactTrace = exports.varTrace = exports.literalTrace = void 0;
exports.literalTrace = { type: "LiteralTrace" };
exports.varTrace = { type: "VarTrace" };
exports.baseFactTrace = { type: "BaseFactTrace" };
exports.binExprTrace = { type: "BinExprTrace" };
// gah this should be derived by the language
function scopePathEq(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}
exports.scopePathEq = scopePathEq;
// term helpers
function str(s) {
    return { type: "StringLit", val: s };
}
exports.str = str;
function int(i) {
    return { type: "IntLit", val: i };
}
exports.int = int;
function rec(relation, attrs) {
    return { type: "Record", relation: relation, attrs: attrs };
}
exports.rec = rec;
function varr(name) {
    return { type: "Var", name: name };
}
exports.varr = varr;
function binExpr(left, op, right) {
    return { type: "BinExpr", left: left, right: right, op: op };
}
exports.binExpr = binExpr;
function array(items) {
    return { type: "Array", items: items };
}
exports.array = array;
exports.trueTerm = { type: "Bool", val: true };
exports.falseTerm = { type: "Bool", val: false };
