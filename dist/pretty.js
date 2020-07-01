"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.escapeString = exports.block = exports.prettyPrintTree = exports.prettyPrintInvokeLoc = exports.prettyPrintScopePath = exports.prettyPrintTrace = exports.defaultTracePrintOpts = exports.prettyPrintTermWithBindings = exports.prettyPrintSituatedBinding = exports.ppVM = exports.ppr = exports.ppb = exports.ppt = exports.prettyPrintResults = exports.prettyPrintRes = exports.prettyPrintBindings = exports.prettyPrintDB = exports.prettyPrintRule = exports.prettyPrintTerm = void 0;
var pp = require("prettier-printer");
var util_1 = require("./util");
var traceTree_1 = require("./traceTree");
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
            return "\"" + escapeString(term.val) + "\"";
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
exports.prettyPrintRule = prettyPrintRule;
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
// compact convenience functions, straight to string
function ppt(t) {
    return pp.render(100, prettyPrintTerm(t));
}
exports.ppt = ppt;
function ppb(b) {
    return pp.render(100, prettyPrintBindings(b));
}
exports.ppb = ppb;
function ppr(r) {
    return pp.render(100, prettyPrintRes(r));
}
exports.ppr = ppr;
function ppVM(vm, scopePath, opts) {
    return pp.render(100, prettyPrintVarMappings(vm, scopePath, opts));
}
exports.ppVM = ppVM;
function prettyPrintVarMappings(vm, scopePath, opts) {
    return [
        "{",
        pp.intersperse(", ", util_1.mapObjToList(vm, function (key, value) { return [
            prettyPrintVar(key, scopePath, opts),
            ": ",
            prettyPrintVar(value, scopePath.slice(0, scopePath.length - 1), opts),
        ]; })),
        "}",
    ];
}
// trace stuff
// TODO: this and prettyPrintVar are almost the same... lol
function prettyPrintSituatedBinding(sb) {
    return [sb.name, prettyPrintScopePath(sb.path)];
}
exports.prettyPrintSituatedBinding = prettyPrintSituatedBinding;
function prettyPrintVar(name, scopePath, opts) {
    return [name, opts.showScopePath ? prettyPrintScopePath(scopePath) : ""];
}
function prettyPrintTermWithBindings(term, scopePath, opts) {
    switch (term.type) {
        case "RecordWithBindings":
            return [
                term.relation,
                block(pp.braces, util_1.mapObjToList(term.attrs, function (k, v) { return [
                    k,
                    ": ",
                    v.binding ? [prettyPrintVar(v.binding, scopePath, opts), "@"] : "",
                    prettyPrintTermWithBindings(v.term, scopePath, opts),
                ]; })),
            ];
        case "ArrayWithBindings":
            return [
                "[",
                pp.intersperse(",", term.items.map(function (t) { return prettyPrintTermWithBindings(t, scopePath, opts); })),
                "]",
            ];
        case "BinExprWithBindings":
            return [
                prettyPrintTermWithBindings(term.left, scopePath, opts),
                " " + term.op + " ",
                prettyPrintTermWithBindings(term.right, scopePath, opts),
            ];
        case "Atom":
            return prettyPrintTerm(term.term);
    }
}
exports.prettyPrintTermWithBindings = prettyPrintTermWithBindings;
exports.defaultTracePrintOpts = { showScopePath: false };
function prettyPrintTrace(tree, opts) {
    return prettyPrintTree(tree, function (_a) {
        var res = _a.item, path = _a.path;
        return pp.render(150, prettyPrintTraceNode(res, traceTree_1.pathToScopePath(path), opts));
    });
}
exports.prettyPrintTrace = prettyPrintTrace;
function prettyPrintTraceNode(res, path, opts) {
    var termDoc = prettyPrintTermWithBindings(traceTree_1.makeTermWithBindings(res.term, res.bindings), path, opts);
    switch (res.trace.type) {
        case "RefTrace":
            return [
                prettyPrintTermWithBindings(traceTree_1.makeTermWithBindings(res.term, res.bindings), path.slice(0, path.length - 1), opts),
                "; ",
                ppVM(res.trace.mappings, path, opts),
            ];
        case "MatchTrace":
            return termDoc;
        default:
            return termDoc;
    }
}
function prettyPrintScopePath(path) {
    return [
        "[",
        pp.intersperse(", ", path.map(function (seg) { return [seg.name, prettyPrintInvokeLoc(seg.invokeLoc)]; })),
        "]",
    ];
}
exports.prettyPrintScopePath = prettyPrintScopePath;
function prettyPrintInvokeLoc(il) {
    return [
        "[",
        pp.intersperse(", ", il.map(function (seg) {
            switch (seg.type) {
                case "OrOpt":
                    return "or(" + seg.idx + ")";
                case "AndClause":
                    return "and(" + seg.idx + ")";
            }
        })),
        "]",
    ];
}
exports.prettyPrintInvokeLoc = prettyPrintInvokeLoc;
function prettyPrintTree(tree, render) {
    return pptRecurse(0, tree, [tree.item], render).join("\n");
}
exports.prettyPrintTree = prettyPrintTree;
function pptRecurse(depth, tree, path, render) {
    return __spreadArrays([
        util_1.repeat(depth, "  ") + render({ item: tree.item, key: tree.key, path: path })
    ], util_1.flatMap(tree.children, function (child) {
        return pptRecurse(depth + 1, child, __spreadArrays(path, [child.item]), render);
    }));
}
// export function prettyPrintTree(tree: Tree): string {
//   return pp.render(100, prettyPrintNode(tree));
// }
// function prettyPrintNode(tree: Tree): pp.IDoc {
//   // console.log("ppn", tree);
//   const res = [
//     tree.body,
//     "X",
//     pp.indent(2, pp.intersperse("X", tree.children.map(prettyPrintNode))),
//     // ...(tree.children.length === 0
//     //   ? []
//     //   : [
//     //       pp.line,
//     //       pp.indent(
//     //         2,
//     //         pp.intersperse(pp.line)(tree.children.map(prettyPrintNode))
//     //       ),
//     //     ]),
//   ];
//   console.log("ppn", res);
//   return res;
// }
// util
function block(pair, docs) {
    return [pair[0], pp.intersperse(", ")(docs), pair[1]];
}
exports.block = block;
function escapeString(str) {
    return str
        .split("\\")
        .join("\\\\")
        .split("\"")
        .join("\\\"")
        .split("\n")
        .join("\\n");
}
exports.escapeString = escapeString;
