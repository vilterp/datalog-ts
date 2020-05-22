"use strict";
exports.__esModule = true;
exports.language = void 0;
var P = require("parsimmon");
exports.language = P.createLanguage({
    expr: function (r) {
        return P.alt(r.funcCall, r.lambda, r.letExpr, r.varExpr, r.stringLit, r.intLit, r.placeholder).skip(P.optWhitespace);
    },
    funcCall: function (r) {
        return P.seq(r.identifier, r.lparen, P.sepBy(r.expr, r.comma), r.rparen).map(function (_a) {
            var name = _a[0], _ = _a[1], args = _a[2], __ = _a[3];
            return ({ type: "FuncCall", name: name, args: args });
        });
    },
    lambda: function (r) {
        return P.seq(r.lparen, P.sepBy(r.param, r.comma), r.rparen, r.colon, r.type.skip(P.optWhitespace), r.rightArrow, r.expr).map(function (_a) {
            var _1 = _a[0], params = _a[1], _2 = _a[2], _3 = _a[3], retType = _a[4], _4 = _a[5], body = _a[6];
            return ({
                type: "Lambda",
                params: params,
                body: body,
                retType: retType
            });
        });
    },
    param: function (r) {
        return P.seq(r.identifier, r.colon, r.type).map(function (_a) {
            var name = _a[0], _ = _a[1], ty = _a[2];
            return ({ ty: ty, name: name });
        });
    },
    letExpr: function (r) {
        return P.seq(r.letWord, r.identifier, P.seq(P.optWhitespace, r.eq), r.expr, P.seq(P.optWhitespace, r.inWord), r.expr).map(function (_a) {
            var _1 = _a[0], name = _a[1], _2 = _a[2], binding = _a[3], _3 = _a[4], body = _a[5];
            return ({
                type: "Let",
                name: name,
                binding: binding,
                body: body
            });
        });
    },
    varExpr: function (r) { return r.identifier.map(function (id) { return ({ type: "Var", name: id }); }); },
    intLit: function () {
        return P.seq(P.index, P.regexp(/[0-9]+/)).map(function (_a) {
            var pos = _a[0], v = _a[1];
            return ({
                type: "IntLit",
                val: Number.parseInt(v),
                pos: pos
            });
        });
    },
    stringLit: function (r) {
        return P.seq(P.index, P.regexp(/"((?:\\.|.)*?)"/, 1)
            .map(interpretEscapes)
            .desc("string")).map(function (_a) {
            var pos = _a[0], s = _a[1];
            return ({ type: "StringLit", val: s, pos: pos });
        });
    },
    identifier: function () {
        return P.seq(P.index, P.regex(/([a-zA-Z_][a-zA-Z0-9_]*)/, 1).desc("identifier")).map(function (_a) {
            var pos = _a[0], ident = _a[1];
            return ({ ident: ident, pos: pos });
        });
    },
    type: function (r) { return r.identifier; },
    placeholder: function () {
        return P.seq(P.index, word("???")).map(function (_a) {
            var pos = _a[0], ident = _a[1];
            return ({
                type: "Placeholder",
                val: { ident: ident, pos: pos }
            });
        });
    },
    eq: function () { return word("="); },
    lparen: function () { return word("("); },
    rparen: function () { return word(")"); },
    colon: function () { return word(":"); },
    comma: function () { return word(","); },
    letWord: function () { return word("let"); },
    inWord: function () { return word("in"); },
    rightArrow: function () { return word("=>"); }
});
function word(str) {
    return P.string(str).skip(P.optWhitespace);
}
// Turn escaped characters into real ones (e.g. "\\n" becomes "\n").
function interpretEscapes(str) {
    var escapes = {
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t"
    };
    return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, function (_, escape) {
        var type = escape.charAt(0);
        var hex = escape.slice(1);
        if (type === "u") {
            return String.fromCharCode(parseInt(hex, 16));
        }
        if (escapes.hasOwnProperty(type)) {
            return escapes[type];
        }
        return type;
    });
}
function pairsToObj(pairs) {
    var out = {};
    pairs.forEach(function (_a) {
        var k = _a[0], v = _a[1];
        out[k] = v;
    });
    return out;
}
