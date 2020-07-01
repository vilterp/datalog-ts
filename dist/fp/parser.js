"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.language = void 0;
var P = require("parsimmon");
exports.language = P.createLanguage({
    expr: function (r) {
        return located(P.alt(r.funcCall, r.lambda, r.letExpr, r.varExpr, r.stringLit, r.intLit, r.placeholder));
    },
    funcCall: function (r) {
        return P.seq(located(r.varExpr), r.lparen, P.sepBy(r.expr, r.comma), r.rparen).map(
        // TODO: don't curry directly in the parser
        function (_a) {
            var func = _a[0], _ = _a[1], args = _a[2], __ = _a[3];
            return curry(func, args);
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
            var letT = _a[0], name = _a[1], _2 = _a[2], binding = _a[3], _b = _a[4], _ = _b[0], inT = _b[1], body = _a[5];
            return ({
                type: "Let",
                letT: letT,
                name: name,
                binding: binding,
                inT: inT,
                body: body
            });
        });
    },
    varExpr: function (r) { return r.identifier.map(function (id) { return ({ type: "Var", name: id.ident }); }); },
    intLit: function () {
        return P.regexp(/[0-9]+/).map(function (v) { return ({
            type: "IntLit",
            val: Number.parseInt(v)
        }); });
    },
    stringLit: function (r) {
        return P.regexp(/"((?:\\.|.)*?)"/, 1)
            .map(interpretEscapes)
            .desc("string")
            .map(function (s) { return ({ type: "StringLit", val: s }); });
    },
    // returns a token. TODO: rename to token?
    identifier: function () {
        return P.seq(P.index, P.regex(/([a-zA-Z_][a-zA-Z0-9_]*)/, 1).desc("identifier"), P.index).map(function (_a) {
            var from = _a[0], ident = _a[1], to = _a[2];
            return ({
                ident: ident,
                span: { from: from.offset, to: to.offset }
            });
        });
    },
    type: function (r) { return r.identifier; },
    placeholder: function () {
        return P.string("???").map(function (ident) { return ({
            type: "Placeholder",
            ident: ident
        }); });
    },
    eq: function () { return word("="); },
    lparen: function () { return word("("); },
    rparen: function () { return word(")"); },
    colon: function () { return word(":"); },
    comma: function () { return word(","); },
    letWord: function () { return locWord("let"); },
    inWord: function () { return locWord("in"); },
    rightArrow: function () { return locWord("=>"); }
});
function locWord(str) {
    return P.seq(P.index, word(str), P.index).map(function (_a) {
        var from = _a[0], _ = _a[1], to = _a[2];
        return ({
            ident: str,
            span: { from: from.offset, to: to.offset }
        });
    });
}
function located(p) {
    return P.seq(P.index, p, P.index).map(function (_a) {
        var from = _a[0], res = _a[1], to = _a[2];
        return (__assign(__assign({}, res), { span: { from: from.offset, to: to.offset } }));
    });
}
function curry(func, args) {
    // TODO: not sure what span to assign here. But this is definitely wrong, lol.
    return args.reduce(function (accum, arg) { return ({ type: "FuncCall", func: accum, arg: arg, span: func.span }); }, func);
}
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
