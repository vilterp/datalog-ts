"use strict";
exports.__esModule = true;
exports.language = void 0;
var P = require("parsimmon");
var types_1 = require("./types");
// adapted from https://github.com/jneen/parsimmon/blob/master/examples/json.js
exports.language = P.createLanguage({
    program: function (r) { return P.sepBy(r.statement, P.optWhitespace).trim(P.optWhitespace); },
    // TODO: add .graphviz?
    statement: function (r) {
        return P.alt(r.insert, r.rule, r.comment, r.tableDecl, r.loadStmt, r.traceStmt);
    },
    loadStmt: function (r) {
        return P.seq(word(".load"), r.filePath).map(function (_a) {
            var _ = _a[0], path = _a[1];
            return ({
                type: "LoadStmt",
                path: path
            });
        });
    },
    traceStmt: function (r) {
        return P.seq(word(".trace"), r.insert).map(function (_a) {
            var _ = _a[0], insert = _a[1];
            return ({
                type: "TraceStmt",
                record: insert.record
            });
        });
    },
    tableDecl: function (r) {
        return P.seq(word(".table"), r.recordIdentifier).map(function (_a) {
            var _ = _a[0], name = _a[1];
            return ({
                type: "TableDecl",
                name: name
            });
        });
    },
    comment: function () {
        return P.regex(/#[^\n]*/).map(function (comment) { return ({ type: "Comment", comment: comment }); });
    },
    insert: function (r) {
        return r.record.skip(r.period).map(function (rec) { return ({ type: "Insert", record: rec }); });
    },
    rule: function (r) {
        return P.seq(r.record, word(":-"), r.ruleOptions, r.period).map(function (_a) {
            var head = _a[0], _ = _a[1], options = _a[2], __ = _a[3];
            return ({
                type: "Rule",
                rule: { head: head, defn: options }
            });
        });
    },
    ruleOptions: function (r) {
        return P.sepBy(r.andClauses, r.or).map(function (xs) { return ({ type: "Or", opts: xs }); });
    },
    andClauses: function (r) {
        return P.sepBy(r.clause, r.and).map(function (xs) { return ({ type: "And", clauses: xs }); });
    },
    clause: function (r) { return P.alt(r.record, r.binExpr); },
    term: function (r) {
        return P.alt(r.arrayLit, r["var"], r.boolLit, r.record, r.stringLit, r.intLit);
    },
    record: function (r) {
        return P.seq(r.recordIdentifier, r.lbrace, r.pair.sepBy(r.comma), r.rbrace).map(function (_a) {
            var ident = _a[0], _ = _a[1], pairs = _a[2], __ = _a[3];
            return ({
                type: "Record",
                relation: ident,
                attrs: pairsToObj(pairs)
            });
        });
    },
    arrayLit: function (r) {
        return P.seq(r.lsquare, P.sepBy(r.term, r.comma), r.rsquare).map(function (_a) {
            var _1 = _a[0], items = _a[1], _2 = _a[2];
            return ({ type: "Array", items: items });
        });
    },
    binExpr: function (r) {
        return P.seq(r.term.skip(P.optWhitespace), r.binOp, r.term.skip(P.optWhitespace)).map(function (_a) {
            var left = _a[0], op = _a[1], right = _a[2];
            return ({
                type: "BinExpr",
                left: left,
                right: right,
                op: op
            });
        });
    },
    stringLit: function () {
        return P.regexp(/"((?:\\.|.)*?)"/, 1)
            .map(interpretEscapes)
            .desc("string")
            .map(function (s) { return ({ type: "StringLit", val: s }); });
    },
    intLit: function () {
        // secretly also parse floats
        return P.regex(/-?[0-9]+(\.[0-9]+)?/).map(function (digits) { return ({
            type: "IntLit",
            val: Number.parseInt(digits)
        }); });
    },
    boolLit: function () {
        return P.alt(P.string("true").map(function () { return types_1.trueTerm; }), P.string("false").map(function () { return types_1.falseTerm; }));
    },
    "var": function () {
        return P.regex(/([A-Z][a-zA-Z0-9_]*)/, 1).map(function (id) { return ({ type: "Var", name: id }); });
    },
    pair: function (r) { return P.seq(r.recordIdentifier.skip(r.colon), r.term); },
    recordIdentifier: function () {
        return P.regex(/([a-zA-Z][a-zA-Z0-9_\.]*)/, 1).desc("record identifier");
    },
    filePath: function () { return P.regex(/[^\n]+/).desc("file path"); },
    binOp: function () { return P.alt(word("=="), word("!="), word("<="), word(">=")); },
    lbrace: function () { return word("{"); },
    rbrace: function () { return word("}"); },
    lsquare: function () { return word("["); },
    rsquare: function () { return word("]"); },
    colon: function () { return word(":"); },
    comma: function () { return word(","); },
    period: function () { return word("."); },
    and: function () { return word("&"); },
    or: function () { return word("|"); }
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
